import { Box } from "@chakra-ui/react"
import { useState } from "react"

import type { SentenceCoverage } from "@/client"

interface SentenceHighlightProps {
  sentence: SentenceCoverage
  onSentenceClick?: (sentence: SentenceCoverage) => void
}

/**
 * Renders a sentence with coverage-based highlighting.
 * Click to see details in the detail panel.
 */
export function SentenceHighlight({
  sentence,
  onSentenceClick,
}: SentenceHighlightProps) {
  const [isHovered, setIsHovered] = useState(false)

  const bgColor = getCoverageBgColor(sentence.coverage_level, isHovered)

  return (
    <Box
      as="span"
      bg={bgColor}
      px={0.5}
      py={0.25}
      borderRadius="sm"
      cursor={onSentenceClick ? "pointer" : "default"}
      transition="background 0.2s"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSentenceClick?.(sentence)}
      title={`Coverage: ${Math.round(sentence.coverage_score * 100)}%`}
    >
      {sentence.text}
    </Box>
  )
}

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
