"""Embedding generation and similarity computation using Azure OpenAI."""

from typing import TYPE_CHECKING

import numpy as np
from openai import AzureOpenAI

from src.config import get_logger, settings

if TYPE_CHECKING:
    from numpy.typing import NDArray

logger = get_logger("coverage.embedding")

# Singleton client instance - lazy loaded
_client: AzureOpenAI | None = None

# Model configuration (text-embedding-3-large produces 3072-dim embeddings)
EMBEDDING_DIMENSION = 3072
BATCH_SIZE = 100  # Azure OpenAI supports up to 2048 inputs per request


def get_embedding_client() -> AzureOpenAI:
    """
    Get or create the Azure OpenAI client (singleton).

    The client is initialized lazily on first use and cached for subsequent calls.
    """
    global _client
    if _client is None:
        endpoint = settings.AZURE_OPENAI_EMBEDDING_ENDPOINT
        api_key = settings.AZURE_OPENAI_EMBEDDING_API_KEY

        if not endpoint:
            raise ValueError(
                "AZURE_OPENAI_EMBEDDING_ENDPOINT is required for coverage analysis"
            )
        if not api_key:
            raise ValueError(
                "AZURE_OPENAI_EMBEDDING_API_KEY is required for coverage analysis"
            )

        # Ensure endpoint doesn't have trailing slash for consistent URL building
        endpoint = endpoint.rstrip("/")

        logger.info(
            "initializing_azure_embedding_client",
            endpoint=endpoint,
            deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
        )
        _client = AzureOpenAI(
            api_key=api_key,
            api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
            azure_endpoint=endpoint,
        )
        logger.info("azure_embedding_client_initialized")
    return _client


def generate_embeddings(texts: list[str]) -> "NDArray[np.float32]":
    """
    Generate embeddings for a batch of texts using Azure OpenAI.

    Args:
        texts: List of text strings to embed

    Returns:
        numpy array of shape (len(texts), EMBEDDING_DIMENSION)
        Embeddings are L2-normalized for cosine similarity via dot product.
    """
    if not texts:
        return np.array([], dtype=np.float32).reshape(0, EMBEDDING_DIMENSION)

    client = get_embedding_client()
    deployment = settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT

    all_embeddings: list[list[float]] = []

    # Process in batches to handle large inputs
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]

        logger.debug(
            "generating_embeddings_batch",
            batch_start=i,
            batch_size=len(batch),
            total=len(texts),
        )

        response = client.embeddings.create(
            input=batch,
            model=deployment,
        )

        # Extract embeddings from response
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    # Convert to numpy array
    embeddings = np.array(all_embeddings, dtype=np.float32)

    # L2 normalize for cosine similarity via dot product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    # Avoid division by zero
    norms = np.where(norms == 0, 1, norms)
    embeddings = embeddings / norms

    logger.debug("embeddings_generated", count=len(texts))
    return embeddings


def compute_similarity_matrix(
    content_embeddings: "NDArray[np.float32]",
    question_embeddings: "NDArray[np.float32]",
) -> "NDArray[np.float32]":
    """
    Compute cosine similarity between content and question embeddings.

    Since embeddings are L2-normalized, dot product equals cosine similarity.

    Args:
        content_embeddings: Shape (num_sentences, embedding_dim)
        question_embeddings: Shape (num_questions, embedding_dim)

    Returns:
        Similarity matrix of shape (num_sentences, num_questions)
        Values range from -1 to 1, with 1 being most similar.
    """
    if content_embeddings.size == 0 or question_embeddings.size == 0:
        return np.array([], dtype=np.float32)

    # Dot product of normalized vectors = cosine similarity
    similarity: NDArray[np.float32] = np.dot(
        content_embeddings, question_embeddings.T
    ).astype(np.float32)

    return similarity
