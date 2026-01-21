# Implementation Plan: Norwegian Language Support for Frontend UI

## Overview

Add comprehensive Norwegian language support to the QuizCrafter frontend UI using react-i18next. This will allow users to switch between English and Norwegian for all interface text, independent of the quiz question generation language.

## User Requirements

- **Independent Settings**: UI language is separate from quiz content language (user can have Norwegian UI while creating English quizzes)
- **localStorage Persistence**: UI language preference stored in browser (no backend changes)
- **react-i18next Library**: Industry-standard i18n with TypeScript support
- **Language Switcher**: Visible toggle in header/navigation

## Current State

- ✅ Backend already supports Norwegian for quiz question generation via `QuizLanguage` enum ("en" | "no")
- ✅ Language selector exists in QuizSettingsStep.tsx but only affects generated questions, not UI
- ❌ No i18n infrastructure - all UI text is hardcoded in English
- ✅ 100% TypeScript coverage with strict mode

## Implementation Strategy

### Phase 1: Foundation Setup

#### 1.1 Install Dependencies

```bash
cd frontend
npm install react-i18next i18next i18next-browser-languagedetector
npm install --save-dev @types/react-i18next
```

#### 1.2 Create Directory Structure

```
frontend/src/i18n/
├── index.ts                 # i18next initialization
├── types.ts                 # TypeScript type definitions
├── locales/
│   ├── en/
│   │   ├── common.json      # Buttons, labels, errors (~50 strings)
│   │   ├── navigation.json  # Header, breadcrumbs (~10 strings)
│   │   ├── quiz.json        # Status, phases, language labels (~30 strings)
│   │   ├── creation.json    # Quiz creation wizard (~80 strings)
│   │   ├── dashboard.json   # Dashboard panels (~30 strings)
│   │   └── validation.json  # Form validation messages (~15 strings)
│   └── no/
│       └── [same structure with Norwegian translations]
```

**Rationale**: 6 namespaces organize ~215 total strings by feature area, aligning with existing component structure.

#### 1.3 Configure i18next

Create [frontend/src/i18n/index.ts](frontend/src/i18n/index.ts):

**Key Configuration:**
```typescript
i18n
  .use(LanguageDetector) // Auto-detect from browser/localStorage
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'quiz', 'creation', 'dashboard', 'validation'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Browser language detection configuration
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then browser
      caches: ['localStorage'],
      lookupLocalStorage: 'quizcrafter_ui_language',
    },

    react: {
      useSuspense: false, // Avoid loading issues
    },
  })
```

**What this does:**
- **First visit**: Detects browser language (Norwegian users get Norwegian automatically)
- **Return visits**: Uses saved preference from localStorage
- **Supported detection**: `navigator.language` checks for "no", "nb" (Bokmål), "nn" (Nynorsk), "en"
- **Fallback**: Defaults to English if browser language not supported
- **User control**: Language switcher overrides browser detection and saves to localStorage

#### 1.4 TypeScript Type Safety

Create [frontend/src/i18n/types.ts](frontend/src/i18n/types.ts):

**Module augmentation** for `react-i18next` to provide:
- ✅ Autocomplete for translation keys
- ✅ Compile-time validation of translation keys
- ✅ Type-safe interpolation parameters

### Phase 2: Translation File Creation

#### 2.1 Extract English Strings to JSON

**Priority order for extraction:**

1. **common.json** (~50 strings): Buttons (save, cancel, next, previous), labels (loading, status, actions), generic errors
2. **quiz.json** (~30 strings): Status labels (created, extracting_content, generating_questions, ready_for_review, exporting_to_canvas, published, failed), failure reasons, language/tone labels
3. **creation.json** (~80 strings): All 4 wizard steps (course selection, module selection, question allocation, settings), form labels, placeholders, descriptions
4. **dashboard.json** (~30 strings): Panel titles, empty states, action buttons, statistics
5. **navigation.json** (~10 strings): Header items, breadcrumbs
6. **validation.json** (~15 strings): Form validation messages with interpolation support

**Example structure for common.json**:
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "next": "Next",
    "previous": "Previous",
    "create": "Create"
  },
  "labels": {
    "loading": "Loading...",
    "status": "Status",
    "actions": "Actions"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "network": "Network error. Please check your connection."
  }
}
```

#### 2.2 Create Norwegian Translations

Translate all English strings to Norwegian with:
- **Formal tone**: Match professional academic context
- **Canvas terms**: Keep "Canvas" and technical terms in English where appropriate
- **Consistency**: Use same terminology across all namespaces

**Example Norwegian translations (common.json)**:
```json
{
  "buttons": {
    "save": "Lagre",
    "cancel": "Avbryt",
    "next": "Neste",
    "previous": "Forrige",
    "create": "Opprett"
  },
  "labels": {
    "loading": "Laster...",
    "status": "Status",
    "actions": "Handlinger"
  },
  "errors": {
    "generic": "Noe gikk galt. Vennligst prøv igjen.",
    "network": "Nettverksfeil. Vennligst sjekk tilkoblingen din."
  }
}
```

### Phase 3: React Integration

#### 3.1 Initialize i18n in App Entry Point

**File**: [frontend/src/main.tsx](frontend/src/main.tsx:1)

**Change**: Add import at top (line ~11):
```typescript
// Add after other imports, before configureApiClient()
import "./i18n"
```

This initializes i18n with localStorage detection before React renders.

#### 3.2 Create Language Selector Component

**File**: `frontend/src/components/UserSettings/LanguagePreference.tsx` (new file)

**Implementation**:
- Similar design pattern to UserInformation component
- Chakra UI RadioGroup with cards for each language option
- Flag icons (🇬🇧 🇳🇴) + language labels
- Shows current selected language with blue highlight
- Calls `i18n.changeLanguage()` on selection
- Automatically persists to localStorage via i18next
- Non-editable display (always interactive, no edit mode needed)

**Design**:
```typescript
<FormField label="Interface Language">
  <Text fontSize="sm" color="gray.600" mb={3}>
    Choose your preferred language for the application interface
  </Text>
  <RadioGroup.Root value={currentLanguage} onValueChange={handleLanguageChange}>
    <VStack gap={3}>
      {/* English Card */}
      <Card.Root borderColor={isEnglish ? "blue.500" : "gray.200"} bg={isEnglish ? "blue.50" : "white"}>
        {/* 🇬🇧 English */}
      </Card.Root>
      {/* Norwegian Card */}
      <Card.Root borderColor={isNorwegian ? "blue.500" : "gray.200"} bg={isNorwegian ? "blue.50" : "white"}>
        {/* 🇳🇴 Norsk */}
      </Card.Root>
    </VStack>
  </RadioGroup.Root>
</FormField>
```

**Test ID**: `data-testid="language-preference"` for Playwright tests

#### 3.3 Add Language Selector to User Settings

**File**: [frontend/src/components/UserSettings/UserInformation.tsx](frontend/src/components/UserSettings/UserInformation.tsx:1)

**Change**: Import and add `<LanguagePreference />` component after the Name field, before the Privacy Policy alert:

```typescript
import LanguagePreference from "./LanguagePreference"

// Inside component render (after name field, before privacy alert):
<Box mt={6}>
  <LanguagePreference />
</Box>
```

This places the language selector in the **"My profile"** tab at [/Users/mariussolaas/quizcrafter/frontend/src/routes/_layout/settings.tsx](frontend/src/routes/_layout/settings.tsx:45).

### Phase 4: Component Migration

#### 4.1 Migration Pattern

**Standard transformation**:
```typescript
// BEFORE: Hardcoded
<Heading>Create New Quiz</Heading>
<Button>Next</Button>

// AFTER: Internationalized
import { useTranslation } from "react-i18next"

function MyComponent() {
  const { t } = useTranslation(['creation', 'common'])

  return (
    <>
      <Heading>{t('creation:title')}</Heading>
      <Button>{t('common:buttons.next')}</Button>
    </>
  )
}
```

**With dynamic content (interpolation)**:
```typescript
// English: "Total Questions: 25"
// Norwegian: "Totalt antall spørsmål: 25"
const { t } = useTranslation('creation')
<Text>{t('questionAllocation.totalQuestions', { count: 25 })}</Text>
```

#### 4.2 Component Priority Order

**Batch 1: Core UI (Day 1)**
1. Common components (buttons, empty states, error displays)
2. Navigation/header components

**Batch 2: Quiz Creation Wizard (Days 2-3)**
3. [frontend/src/routes/_layout/create-quiz.tsx](frontend/src/routes/_layout/create-quiz.tsx:1) - Main wizard container
4. [frontend/src/components/QuizCreation/CourseSelectionStep.tsx](frontend/src/components/QuizCreation/CourseSelectionStep.tsx:1) - Step 1
5. [frontend/src/components/QuizCreation/ModuleSelectionStep.tsx](frontend/src/components/QuizCreation/ModuleSelectionStep.tsx:1) - Step 2
6. [frontend/src/components/QuizCreation/ModuleQuestionSelectionStep.tsx](frontend/src/components/QuizCreation/ModuleQuestionSelectionStep.tsx:1) - Step 3
7. [frontend/src/components/QuizCreation/QuizSettingsStep.tsx](frontend/src/components/QuizCreation/QuizSettingsStep.tsx:1) - Step 4 (see special handling below)

**Batch 3: Dashboard & Lists (Day 4)**
8. [frontend/src/components/Common/QuizTable.tsx](frontend/src/components/Common/QuizTable.tsx:1) - Quiz table headers
9. [frontend/src/components/dashboard/panels/QuizGenerationPanel.tsx](frontend/src/components/dashboard/panels/QuizGenerationPanel.tsx:1) - Dashboard panels
10. [frontend/src/routes/_layout/quizzes.tsx](frontend/src/routes/_layout/quizzes.tsx:1) - Quiz list page

#### 4.3 Special Handling: QuizSettingsStep.tsx

**Current behavior**: Language selector at [QuizSettingsStep.tsx:70-111](frontend/src/components/QuizCreation/QuizSettingsStep.tsx:70) sets **quiz content language** (passed to LLM).

**After implementation**:
- Add helper text clarifying this is for **quiz question language**, not UI language
- Keep existing functionality unchanged
- Translation keys: Use `quiz:language.*` namespace

**Example change**:
```typescript
const { t } = useTranslation(['quiz', 'common'])

<FormField label={t('quiz:language.label')} isRequired>
  <Text fontSize="sm" color="gray.600" mb={3}>
    {t('quiz:language.description')}
    {/* New: "This sets the language for generated questions, not the interface" */}
  </Text>
  {/* Rest unchanged */}
</FormField>
```

#### 4.4 Status Labels Migration

**Current**: Status constants in [frontend/src/lib/constants/index.ts](frontend/src/lib/constants/index.ts:1)

**Strategy**: Instead of translating constants file, use status value as translation key:

```typescript
// In components that display status:
const { t } = useTranslation('quiz')
const statusLabel = t(`quiz:status.${quiz.status}`)
```

This maintains single source of truth for status enum values.

### Phase 5: Testing & Verification

#### 5.1 Manual Testing Checklist

**Language Switching**:
- [ ] Language switcher visible in header
- [ ] Switching to Norwegian updates all visible UI text immediately
- [ ] Refresh page preserves language selection (localStorage)
- [ ] Switching back to English works correctly

**Component Coverage**:
- [ ] Quiz creation wizard - all 4 steps display correctly
- [ ] Course and module selection with loading/error states
- [ ] Quiz settings with independent quiz language selector
- [ ] Quiz table with status labels
- [ ] Dashboard panels

**Independent Settings Verification**:
- [ ] UI in Norwegian + Quiz language English → Quiz questions generated in English
- [ ] UI in English + Quiz language Norwegian → Quiz questions generated in Norwegian
- [ ] UI language and quiz language selectors are visually distinct

**Edge Cases**:
- [ ] Missing translation keys fall back to English
- [ ] Dynamic content (interpolation) renders correctly
- [ ] Long Norwegian words don't break layouts
- [ ] Empty states and error messages display correctly

#### 5.2 Playwright Test Enhancement

Add test in `frontend/e2e/` for language switching:

```typescript
test('UI language is independent of quiz language', async ({ page }) => {
  // Navigate to Settings page
  await page.goto('/settings')

  // Switch UI to Norwegian in Language Preference section
  await page.click('[data-testid="language-preference"]')
  await page.click('text=Norsk')

  // Verify Settings page text is Norwegian
  await expect(page.locator('h1')).toContainText('Brukerinnstillinger') // "User Settings"

  // Navigate to quiz creation
  await page.goto('/create-quiz')

  // Verify quiz creation wizard UI is Norwegian
  await expect(page.locator('h1')).toContainText('Opprett ny quiz')

  // Navigate through wizard steps to Quiz Settings
  // ... navigate to step 4 ...

  // Select English for quiz language (independent of UI)
  await page.click('[data-testid="language-card-en"]')

  // Verify UI remains Norwegian while quiz language is English
  const quizLangCard = await page.locator('[data-testid="language-card-en"]')
  await expect(quizLangCard).toHaveAttribute('data-selected', 'true')
})
```

### Phase 6: Performance Considerations

**Bundle Size**: ~15KB total for all translations (acceptable)
- No lazy loading needed initially
- Upfront loading provides instant language switching
- Simpler code without loading states

**Future Optimization** (if needed):
- Implement `i18next-http-backend` for lazy namespace loading
- Would reduce initial bundle but add network latency

**No memoization needed**: Translation lookups are highly optimized by i18next.

## Critical Files Summary

### New Files to Create
1. `frontend/src/i18n/index.ts` - i18next configuration
2. `frontend/src/i18n/types.ts` - TypeScript module augmentation
3. `frontend/src/i18n/locales/en/*.json` - 6 English translation files
4. `frontend/src/i18n/locales/no/*.json` - 6 Norwegian translation files
5. `frontend/src/components/UserSettings/LanguagePreference.tsx` - Language selector component

### Existing Files to Modify
6. [frontend/src/main.tsx](frontend/src/main.tsx:1) - Add `import "./i18n"` at line ~11
7. [frontend/src/components/UserSettings/UserInformation.tsx](frontend/src/components/UserSettings/UserInformation.tsx:1) - Add LanguagePreference component
8. [frontend/src/routes/_layout/settings.tsx](frontend/src/routes/_layout/settings.tsx:1) - User settings page (language selector location)
9. [frontend/src/components/QuizCreation/QuizSettingsStep.tsx](frontend/src/components/QuizCreation/QuizSettingsStep.tsx:70) - Add useTranslation, clarify quiz language vs UI language
10. [frontend/src/components/QuizCreation/CourseSelectionStep.tsx](frontend/src/components/QuizCreation/CourseSelectionStep.tsx:1) - Replace hardcoded strings
11. [frontend/src/components/QuizCreation/ModuleSelectionStep.tsx](frontend/src/components/QuizCreation/ModuleSelectionStep.tsx:1) - Replace hardcoded strings
12. [frontend/src/components/QuizCreation/ModuleQuestionSelectionStep.tsx](frontend/src/components/QuizCreation/ModuleQuestionSelectionStep.tsx:1) - Replace hardcoded strings
13. [frontend/src/routes/_layout/create-quiz.tsx](frontend/src/routes/_layout/create-quiz.tsx:1) - Replace hardcoded strings
14. [frontend/src/components/Common/QuizTable.tsx](frontend/src/components/Common/QuizTable.tsx:1) - Replace table headers
15. [frontend/src/components/dashboard/panels/QuizGenerationPanel.tsx](frontend/src/components/dashboard/panels/QuizGenerationPanel.tsx:1) - Replace panel text
16. [frontend/src/routes/_layout/quizzes.tsx](frontend/src/routes/_layout/quizzes.tsx:1) - Replace page text

### No Backend Changes Required
- UI language is purely frontend concern
- Existing `QuizLanguage` enum already supports Norwegian for question generation
- localStorage persistence means no API modifications needed

## Architectural Decisions

1. **Independent Language Settings**: UI language (i18next) is completely separate from quiz content language (backend QuizLanguage field). User has full control over both.

2. **localStorage Persistence**: UI language stored at key `quizcrafter_ui_language`, persists across sessions, no user account data needed.

3. **Namespace Organization**: 6 namespaces (common, navigation, quiz, creation, dashboard, validation) balance granularity with simplicity, align with component structure.

4. **Type Safety**: TypeScript module augmentation provides full autocomplete and compile-time validation for translation keys.

5. **No Lazy Loading**: ~15KB bundle impact is acceptable for instant language switching and simpler code.

6. **Status Constants as Keys**: Quiz status values used directly as translation keys (e.g., `t('quiz:status.created')`) instead of translating constants file.

## Testing After Implementation

**Manual verification flow**:
1. Install dependencies with `npm install`
2. Start dev server with `npm run dev`
3. Open browser, verify English UI by default
4. Navigate to Settings → My profile
5. Select Norwegian in Language Preference section
6. Verify immediate UI update across entire application
7. Create new quiz, verify wizard is in Norwegian
8. At QuizSettingsStep, select "English" for quiz language
9. Verify UI remains Norwegian (independent settings)
10. Refresh page, verify UI language persists
11. Complete quiz creation, verify generated questions are in English
12. Run `npm run lint` to verify TypeScript types

**Playwright test**:
- Run `npx playwright test` to verify language switching behavior
- Add new test for independent language settings

## Estimated Scope

- **Translation strings**: ~215 total (en + no = ~430 strings)
- **Components to modify**: ~16 files
- **New components**: 1 (LanguagePreference)
- **New configuration files**: 14 (i18n setup + 12 JSON translation files)
- **Backend changes**: 0
- **Bundle size impact**: ~15KB

## Success Criteria

✅ Users can switch between English and Norwegian UI via Settings → My profile
✅ Language preference persists across browser sessions (localStorage)
✅ UI language is independent of quiz content language
✅ All ~215 UI strings are translated and display correctly
✅ TypeScript compilation succeeds with full type safety
✅ All existing tests pass
✅ New Playwright test verifies independent language settings
✅ No visual layout breaks with longer Norwegian text
