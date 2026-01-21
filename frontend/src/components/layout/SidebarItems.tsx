import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { FiFileText, FiHome, FiSettings } from "react-icons/fi"

interface SidebarItemsProps {
  onClose?: () => void
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const { t } = useTranslation("navigation")
  const location = useRouterState({
    select: (state) => state.location,
  })

  const items = [
    { icon: FiHome, title: t("sidebar.dashboard"), path: "/" },
    { icon: FiFileText, title: t("sidebar.quizzes"), path: "/quizzes" },
    { icon: FiSettings, title: t("sidebar.settings"), path: "/settings" },
  ]

  const listItems = items.map(({ icon, title, path }) => {
    const isActive =
      path === "/quizzes"
        ? location.pathname === path ||
          location.pathname === "/create-quiz" ||
          location.pathname.startsWith("/quiz/")
        : location.pathname === path

    return (
      <RouterLink
        key={path}
        to={path as any}
        params={{} as any}
        onClick={onClose}
      >
        <Flex
          direction="column"
          gap={2}
          px={4}
          py={2}
          color={isActive ? "#013343" : "white"}
          bg={isActive ? "white" : "transparent"}
          _hover={{
            background: isActive ? "white" : "#314159",
          }}
          alignItems="center"
          fontSize="sm"
        >
          <Icon as={icon} boxSize={7} />
          <Text>{title}</Text>
        </Flex>
      </RouterLink>
    )
  })

  return (
    <>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
