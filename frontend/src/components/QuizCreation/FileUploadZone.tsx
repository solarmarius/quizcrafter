import {
  Box,
  Button,
  FileUpload,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { memo, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { HiUpload, HiX } from "react-icons/hi"

interface FileUploadZoneProps {
  /** Callback when files are selected */
  onFilesSelect: (files: File[]) => void
  /** Whether the upload is in progress */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
  /** Callback when validation errors occur */
  onValidationError?: (error: string | null) => void
}

/**
 * File upload zone for multiple PDF files with drag & drop support.
 *
 * Features:
 * - Drag & drop multiple file upload
 * - PDF file validation (5MB per file, 25MB total, max 5 files)
 * - Visual feedback for drag states
 * - Individual file removal
 * - Error handling and validation
 *
 * @example
 * ```tsx
 * <FileUploadZone
 *   onFilesSelect={handleFilesSelect}
 *   isLoading={isProcessing}
 *   error={uploadError}
 * />
 * ```
 */
export const FileUploadZone = memo(function FileUploadZone({
  onFilesSelect,
  isLoading = false,
  error,
  onValidationError,
}: FileUploadZoneProps) {
  const { t } = useTranslation("creation")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [localValidationError, setLocalValidationError] = useState<
    string | null
  >(null)

  const validateFiles = useCallback(
    (files: File[], existingFiles: File[] = []): string | null => {
      const maxFiles = 5
      const maxFileSize = 5 * 1024 * 1024 // 5MB per file
      const maxTotalSize = 25 * 1024 * 1024 // 25MB total

      // Check total file count
      const totalFiles = files.length + existingFiles.length
      if (totalFiles > maxFiles) {
        return t("fileUpload.maxFilesError", { max: maxFiles })
      }

      // Check each file
      for (const file of files) {
        // Check file type
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          return t("fileUpload.invalidTypeError", { name: file.name })
        }

        // Check individual file size
        if (file.size > maxFileSize) {
          return t("fileUpload.fileTooLargeError", {
            name: file.name,
            max: maxFileSize / (1024 * 1024),
          })
        }
      }

      // Check total size
      const totalSize = [...files, ...existingFiles].reduce(
        (sum, file) => sum + file.size,
        0,
      )
      if (totalSize > maxTotalSize) {
        return t("fileUpload.totalSizeError")
      }

      return null
    },
    [t],
  )

  const handleFileChange = useCallback(
    (details: { acceptedFiles: File[] }) => {
      const newFiles = details.acceptedFiles

      if (!newFiles.length) {
        // Clear validation error when no files are selected
        setLocalValidationError(null)
        onValidationError?.(null)
        return
      }

      const validationError = validateFiles(newFiles, selectedFiles)
      if (validationError) {
        // Set local validation error and notify parent
        setLocalValidationError(validationError)
        onValidationError?.(validationError)
        return
      }

      // Clear any previous validation errors on successful validation
      setLocalValidationError(null)
      onValidationError?.(null)

      const updatedFiles = [...selectedFiles, ...newFiles]
      setSelectedFiles(updatedFiles)
      onFilesSelect(updatedFiles)
    },
    [onFilesSelect, validateFiles, selectedFiles, onValidationError],
  )

  const handleRemoveFile = useCallback(
    (fileToRemove: File) => {
      const updatedFiles = selectedFiles.filter((file) => file !== fileToRemove)
      setSelectedFiles(updatedFiles)
      onFilesSelect(updatedFiles)

      // Clear validation errors when removing files
      setLocalValidationError(null)
      onValidationError?.(null)
    },
    [selectedFiles, onFilesSelect, onValidationError],
  )

  return (
    <VStack gap={4} align="stretch">
      <Text fontSize="lg" fontWeight="semibold">
        {t("fileUpload.title")}
      </Text>

      <FileUpload.Root
        accept="application/pdf,.pdf"
        maxFiles={5}
        maxFileSize={5 * 1024 * 1024} // 5MB per file
        onFileChange={handleFileChange}
        disabled={isLoading}
      >
        <FileUpload.HiddenInput />

        <FileUpload.Trigger asChild>
          <Box
            p={8}
            border="2px dashed"
            borderColor={error || localValidationError ? "red.300" : "gray.300"}
            borderRadius="lg"
            bg={error || localValidationError ? "red.50" : "gray.50"}
            cursor={isLoading ? "not-allowed" : "pointer"}
            opacity={isLoading ? 0.6 : 1}
            transition="all 0.2s"
            _hover={
              !isLoading && !error && !localValidationError
                ? {
                    borderColor: "blue.400",
                    bg: "blue.50",
                  }
                : {}
            }
            textAlign="center"
          >
            <VStack gap={3}>
              <Box fontSize="3xl" color="gray.400">
                📄
              </Box>
              <VStack gap={1}>
                <Text fontSize="md" fontWeight="medium" color="gray.700">
                  {isLoading
                    ? t("manualModule.processing")
                    : t("fileUpload.dropzone")}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {t("fileUpload.restrictions")}
                </Text>
              </VStack>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <HiUpload /> {t("fileUpload.chooseFile")}
              </Button>
            </VStack>
          </Box>
        </FileUpload.Trigger>

        {/* File list will be handled by our custom selectedFile display */}
      </FileUpload.Root>

      {(error || localValidationError) && (
        <Box
          p={3}
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          borderRadius="md"
        >
          <Text fontSize="sm" color="red.600">
            {error || localValidationError}
          </Text>
        </Box>
      )}

      {selectedFiles.length > 0 && (
        <VStack gap={2} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            {t("fileUpload.selectedFiles", { count: selectedFiles.length })}
          </Text>
          {selectedFiles.map((file, index) => (
            <Box
              key={`${file.name}-${index}`}
              p={3}
              bg="green.50"
              border="1px solid"
              borderColor="green.200"
              borderRadius="md"
            >
              <HStack justify="space-between" align="center">
                <VStack align="start" gap={0} flex={1}>
                  <Text fontSize="sm" color="green.700" fontWeight="medium">
                    {file.name}
                  </Text>
                  <Text fontSize="xs" color="green.600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </VStack>
                <IconButton
                  aria-label={`Remove ${file.name}`}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => handleRemoveFile(file)}
                  disabled={isLoading}
                >
                  <HiX />
                </IconButton>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  )
})
