import { Box, Button, Flex, Image } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import Logo from "/assets/images/quizcrafterlogo.svg"

import { useAuth } from "@/hooks/auth"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const { logout } = useAuth()
  const { t } = useTranslation("common")

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      <Box
        position="sticky"
        bg="#013343"
        top={0}
        minW="150px"
        h="100vh"
        pl={4}
        data-testid="sidebar"
      >
        <Flex direction="column" w="100%" h="100%" alignItems="center">
          <Link to="/">
            <Image src={Logo} maxW="140px" p={4} />
          </Link>
          <Box w="100%">
            <SidebarItems />
          </Box>
          <Button onClick={handleLogout} w="90%" mt={4} colorPalette="blue">
            {t("actions.logOut")}
          </Button>
        </Flex>
      </Box>
    </>
  )
}

export default Sidebar
