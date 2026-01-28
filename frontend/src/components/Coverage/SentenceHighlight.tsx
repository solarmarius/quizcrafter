import { Box } from "@chakra-ui/react"
import type { KeyboardEvent } from "react"
import { memo, useState } from "react"

import type { SentenceCoverage } from "@/client"

interface SentenceHighlightProps {
  sentence: SentenceCoverage
  onSentenceClick?: (sentence: SentenceCoverage) => void
}

/**
 * Renders a sentence with coverage-based highlighting.
 * Click or press Enter/Space to see details in the detail panel.
 * Fully keyboard accessible when clickable.
 */
export const SentenceHighlight = memo(function SentenceHighlight({
  sentence,
  onSentenceClick,
}: SentenceHighlightProps) {
  const [isHovered, setIsHovered] = useState(false)

  const bgColor = getCoverageBgColor(sentence.coverage_level, isHovered)
  const isClickable = Boolean(onSentenceClick)

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onSentenceClick?.(sentence)
    }
  }

  return (
    <Box
      as="span"
      bg={bgColor}
      px={0.5}
      py={0.25}
      borderRadius="sm"
      cursor={isClickable ? "pointer" : "default"}
      transition="background 0.2s"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onClick={() => onSentenceClick?.(sentence)}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
      aria-label={
        isClickable
          ? `Sentence with ${Math.round(
              sentence.coverage_score * 100,
            )}% coverage. ${sentence.text}`
          : undefined
      }
    >
      {sentence.text}
    </Box>
  )
})

function getCoverageBgColor(level: string, isHovered: boolean): string {
  const alpha = isHovered ? "400" : "200"
  switch (level) {
    case "high":
      return `green.${alpha}`
    case "medium":
      return `yellow.${alpha}`
    case "low":
      return `orange.${alpha}`
    default:
      return `red.${alpha}`
  }
}
