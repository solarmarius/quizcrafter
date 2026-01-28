import { IconButton, Popover, Portal } from "@chakra-ui/react"
import type * as React from "react"
import { LuInfo } from "react-icons/lu"

interface ToggleTipProps {
  children: React.ReactNode
  "aria-label"?: string
}

/**
 * ToggleTip component - looks like a tooltip but works like a popover.
 * Displays an info icon that reveals explanatory content when clicked.
 */
export function ToggleTip({
  children,
  "aria-label": ariaLabel = "Info",
}: ToggleTipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton aria-label={ariaLabel} variant="ghost" size="sm">
          <LuInfo />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="sm" p={4}>
            {children}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
