"""Sentence tokenization utilities for content coverage analysis."""

import re
from dataclasses import dataclass

import nltk  # type: ignore[import-untyped]
from nltk.tokenize import sent_tokenize  # type: ignore[import-untyped]

from src.config import get_logger

logger = get_logger("coverage.tokenizer")


def _ensure_nltk_data() -> None:
    """Download required NLTK data if not present."""
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        logger.info("downloading_nltk_data", package="punkt_tab")
        nltk.download("punkt_tab", quiet=True)


# Ensure NLTK data is available on module load
_ensure_nltk_data()


@dataclass
class SentenceSpan:
    """Represents a sentence with its position in the original text."""

    text: str
    start: int
    end: int
    index: int


def split_into_sentences(
    text: str,
    min_length: int = 10,
) -> list[SentenceSpan]:
    """
    Split text into sentences with position tracking.

    Args:
        text: Input text to split
        min_length: Minimum sentence length in characters (filters noise)

    Returns:
        List of SentenceSpan objects with text and positions
    """
    if not text or len(text.strip()) < min_length:
        return []

    # Clean text: normalize whitespace but preserve structure
    cleaned_text = re.sub(r"\s+", " ", text).strip()

    # Tokenize using NLTK
    sentences = sent_tokenize(cleaned_text)

    spans: list[SentenceSpan] = []
    current_pos = 0

    for sentence in sentences:
        # Find sentence position in cleaned text
        start_pos = cleaned_text.find(sentence, current_pos)
        if start_pos == -1:
            start_pos = current_pos

        end_pos = start_pos + len(sentence)

        # Filter very short sentences (likely noise like headers, labels)
        if len(sentence.strip()) >= min_length:
            spans.append(
                SentenceSpan(
                    text=sentence.strip(),
                    start=start_pos,
                    end=end_pos,
                    index=len(spans),
                )
            )

        current_pos = end_pos

    logger.debug(
        "sentences_split",
        sentence_count=len(spans),
        text_length=len(text),
    )
    return spans
