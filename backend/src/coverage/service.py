"""Coverage analysis service for computing question-to-content mappings."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select

from src.config import get_logger
from src.question.types import Question
from src.quiz.models import Quiz

from .embedding import compute_similarity_matrix, generate_embeddings
from .schemas import (
    AnnotatedPage,
    CoverageStatistics,
    ModuleCoverage,
    ModuleCoverageResponse,
    ModuleListItem,
    ModuleListResponse,
    QuestionMapping,
    SentenceCoverage,
)
from .tokenizer import split_into_sentences

logger = get_logger("coverage.service")

# Coverage thresholds for categorizing sentences
COVERAGE_THRESHOLDS = {
    "high": 0.7,  # >= 0.7 similarity = high coverage
    "medium": 0.5,  # >= 0.5 = medium coverage
    "low": 0.3,  # >= 0.3 = low coverage
    # < 0.3 = no coverage
}


def get_modules_for_coverage(
    session: Session,
    quiz_id: UUID,
) -> ModuleListResponse:
    """
    List modules available for coverage analysis.

    Args:
        session: Database session
        quiz_id: Quiz identifier

    Returns:
        ModuleListResponse with available modules
    """
    logger.info("listing_modules_for_coverage", quiz_id=str(quiz_id))

    # Get quiz
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise ValueError(f"Quiz {quiz_id} not found")

    if not quiz.selected_modules:
        return ModuleListResponse(quiz_id=quiz_id, modules=[])

    # Count questions per module
    question_counts: dict[str, int] = {}
    stmt = select(Question.module_id).where(
        Question.quiz_id == quiz_id,
        Question.deleted == False,  # noqa: E712
        Question.module_id.isnot(None),  # type: ignore[union-attr]
    )
    result = session.execute(stmt)
    for (module_id,) in result:
        if module_id:
            question_counts[module_id] = question_counts.get(module_id, 0) + 1

    # Build module list
    modules: list[ModuleListItem] = []
    extracted_content = quiz.extracted_content or {}

    for module_id, module_data in quiz.selected_modules.items():
        module_name = module_data.get("name", f"Module {module_id}")
        has_content = module_id in extracted_content and bool(
            extracted_content[module_id]
        )

        modules.append(
            ModuleListItem(
                module_id=module_id,
                module_name=module_name,
                question_count=question_counts.get(module_id, 0),
                has_content=has_content,
            )
        )

    logger.info(
        "modules_listed_for_coverage",
        quiz_id=str(quiz_id),
        module_count=len(modules),
    )

    return ModuleListResponse(quiz_id=quiz_id, modules=modules)


async def compute_module_coverage(
    session: AsyncSession,
    quiz_id: UUID,
    module_id: str,
) -> ModuleCoverageResponse:
    """
    Compute coverage analysis for a specific module.

    Args:
        session: Async database session
        quiz_id: Quiz identifier
        module_id: Module identifier to analyze

    Returns:
        ModuleCoverageResponse with detailed coverage data
    """
    logger.info(
        "coverage_computation_started",
        quiz_id=str(quiz_id),
        module_id=module_id,
    )

    # Get quiz
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    result = await session.execute(stmt)
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise ValueError(f"Quiz {quiz_id} not found")

    if not quiz.extracted_content:
        raise ValueError("Quiz has no extracted content")

    if module_id not in quiz.extracted_content:
        raise ValueError(f"Module {module_id} not found in extracted content")

    module_name = quiz.selected_modules.get(module_id, {}).get(
        "name", f"Module {module_id}"
    )

    # Get questions for this module
    q_stmt = select(Question).where(
        Question.quiz_id == quiz_id,
        Question.module_id == module_id,
        Question.deleted == False,  # noqa: E712
    )
    q_result = await session.execute(q_stmt)
    questions = list(q_result.scalars().all())

    if not questions:
        raise ValueError(f"No questions found for module {module_id}")

    # Extract question texts and types
    question_texts: list[str] = []
    question_ids: list[UUID] = []
    question_types: list[str] = []

    for q in questions:
        q_text = q.question_data.get("question_text", "")
        if q_text:
            question_texts.append(q_text)
            question_ids.append(q.id)
            question_types.append(q.question_type.value)

    if not question_texts:
        raise ValueError("No valid question texts found")

    # Get module content
    module_content = quiz.extracted_content[module_id]
    if isinstance(module_content, dict):
        # Single page
        pages_data = [module_content]
    elif isinstance(module_content, list):
        pages_data = module_content
    else:
        raise ValueError(f"Invalid content format for module {module_id}")

    # Generate question embeddings
    logger.info(
        "generating_question_embeddings",
        count=len(question_texts),
    )
    question_embeddings = generate_embeddings(question_texts)

    # Process each page
    annotated_pages: list[AnnotatedPage] = []
    all_question_mappings: dict[UUID, QuestionMapping] = {
        qid: QuestionMapping(
            question_id=qid,
            question_text=question_texts[i][:300],
            question_type=question_types[i],
            best_matching_sentences=[],
            best_similarity_score=0.0,
        )
        for i, qid in enumerate(question_ids)
    }

    total_sentences = 0
    total_covered = 0
    largest_gap = 0
    current_gap = 0

    for page in pages_data:
        if not isinstance(page, dict):
            continue

        content = page.get("content", "")
        title = page.get("title", "Untitled")

        if not content:
            continue

        # Split into sentences
        sentence_spans = split_into_sentences(content)
        if not sentence_spans:
            continue

        # Generate sentence embeddings
        sentence_texts = [s.text for s in sentence_spans]
        logger.debug(
            "generating_sentence_embeddings",
            page_title=title,
            count=len(sentence_texts),
        )
        sentence_embeddings = generate_embeddings(sentence_texts)

        # Compute similarity matrix
        similarity_matrix = compute_similarity_matrix(
            sentence_embeddings, question_embeddings
        )

        # Process each sentence
        sentence_coverages: list[SentenceCoverage] = []
        coverage_counts: dict[str, int] = {"none": 0, "low": 0, "medium": 0, "high": 0}

        for i, span in enumerate(sentence_spans):
            if similarity_matrix.size > 0:
                similarities = similarity_matrix[i]
                # Clamp to 0 as negative cosine similarity indicates no semantic match
                max_similarity = max(0.0, float(similarities.max()))

                # Find matched questions (above low threshold)
                matched_q_ids = [
                    question_ids[j]
                    for j, sim in enumerate(similarities)
                    if sim >= COVERAGE_THRESHOLDS["low"]
                ]

                # Update question mappings
                for j, sim in enumerate(similarities):
                    if sim >= COVERAGE_THRESHOLDS["low"]:
                        qid = question_ids[j]
                        mapping = all_question_mappings[qid]
                        if sim > mapping.best_similarity_score:
                            mapping.best_similarity_score = float(sim)
                        if span.index not in mapping.best_matching_sentences:
                            mapping.best_matching_sentences.append(span.index)
            else:
                max_similarity = 0.0
                matched_q_ids = []

            # Determine coverage level
            if max_similarity >= COVERAGE_THRESHOLDS["high"]:
                level = "high"
            elif max_similarity >= COVERAGE_THRESHOLDS["medium"]:
                level = "medium"
            elif max_similarity >= COVERAGE_THRESHOLDS["low"]:
                level = "low"
            else:
                level = "none"

            sentence_coverages.append(
                SentenceCoverage(
                    sentence_index=span.index,
                    text=span.text,
                    start_char=span.start,
                    end_char=span.end,
                    coverage_score=max_similarity,
                    coverage_level=level,
                    matched_questions=matched_q_ids,
                    top_question_similarity=max_similarity
                    if max_similarity > 0
                    else None,
                )
            )

            coverage_counts[level] += 1
            total_sentences += 1

            if level != "none":
                total_covered += 1
                largest_gap = max(largest_gap, current_gap)
                current_gap = 0
            else:
                current_gap += 1

        # Final gap check
        largest_gap = max(largest_gap, current_gap)

        # Calculate word count
        word_count = len(content.split())

        annotated_pages.append(
            AnnotatedPage(
                title=title,
                sentences=sentence_coverages,
                word_count=word_count,
                coverage_summary=coverage_counts,
            )
        )

    # Count gaps (consecutive uncovered sections)
    gap_count = _count_coverage_gaps(annotated_pages)

    # Build module coverage
    overall_pct = (total_covered / total_sentences * 100) if total_sentences > 0 else 0

    module_coverage = ModuleCoverage(
        module_id=module_id,
        module_name=module_name,
        pages=annotated_pages,
        overall_coverage_percentage=overall_pct,
        total_sentences=total_sentences,
        covered_sentences=total_covered,
        gap_count=gap_count,
    )

    # Build statistics
    statistics = CoverageStatistics(
        total_sentences=total_sentences,
        covered_sentences=total_covered,
        coverage_percentage=overall_pct,
        total_questions=len(questions),
        largest_gap_sentences=largest_gap,
    )

    # Limit sentence references in question mappings
    question_mappings = list(all_question_mappings.values())
    for mapping in question_mappings:
        mapping.best_matching_sentences = mapping.best_matching_sentences[:5]

    logger.info(
        "coverage_computation_completed",
        quiz_id=str(quiz_id),
        module_id=module_id,
        total_sentences=total_sentences,
        coverage_percentage=overall_pct,
    )

    return ModuleCoverageResponse(
        quiz_id=quiz_id,
        module=module_coverage,
        question_mappings=question_mappings,
        statistics=statistics,
        computed_at=datetime.now(timezone.utc).isoformat(),
    )


def _count_coverage_gaps(pages: list[AnnotatedPage]) -> int:
    """Count number of consecutive uncovered sentence groups."""
    gap_count = 0
    in_gap = False

    for page in pages:
        for sent in page.sentences:
            if sent.coverage_level == "none":
                if not in_gap:
                    gap_count += 1
                    in_gap = True
            else:
                in_gap = False

    return gap_count
