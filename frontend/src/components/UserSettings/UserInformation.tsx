import { Alert, Box, Button, Flex, Input, Link, Text } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"

import {
  type ApiError,
  type UserPublic,
  type UserUpdateMe,
  UsersService,
} from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { useAuth } from "@/hooks/auth"
import { useCustomToast, useErrorHandler } from "@/hooks/common"
import LanguagePreference from "./LanguagePreference"

const UserInformation = () => {
  const { t } = useTranslation("common")
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { handleError } = useErrorHandler()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: currentUser?.name,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(t("userSettings.updateSuccess"))
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  return (
    <>
      <Box
        w={{ sm: "full", md: "sm" }}
        as="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormGroup>
          <FormField label={t("userSettings.name.label")} isRequired>
            {editMode ? (
              <Input
                {...register("name", { maxLength: 30 })}
                type="text"
                size="md"
                placeholder={t("userSettings.name.placeholder")}
              />
            ) : (
              <Text
                fontSize="md"
                py={2}
                color={!currentUser?.name ? "gray" : "inherit"}
                truncate
                maxW="sm"
              >
                {currentUser?.name || t("labels.notAvailable")}
              </Text>
            )}
          </FormField>

          <Flex gap={3}>
            <Button
              variant="solid"
              onClick={toggleEditMode}
              type={editMode ? "button" : "submit"}
              loading={editMode ? isSubmitting : false}
              disabled={editMode ? !isDirty || !getValues("name") : false}
              colorPalette="blue"
            >
              {editMode ? t("actions.save") : t("actions.edit")}
            </Button>
            {editMode && (
              <Button
                variant="subtle"
                colorPalette="gray"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {t("actions.cancel")}
              </Button>
            )}
          </Flex>
        </FormGroup>
      </Box>

      <Box mt={6}>
        <LanguagePreference />
      </Box>

      <Alert.Root status="info" variant="subtle" mt={6} colorPalette="orange">
        <Alert.Content>
          <Alert.Description>
            <Trans
              i18nKey="userSettings.privacyNotice"
              ns="common"
              components={{
                privacyLink: (
                  <Link
                    href="/privacy-policy"
                    color="blue.500"
                    textDecoration="underline"
                  />
                ),
              }}
            />
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    </>
  )
}

export default UserInformation
