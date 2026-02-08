# Extract and Store Favicons

- [x] Update database schema (Prisma & SQL) to add `favicon_url` column
- [x] Create script `src/scripts/fetch-favicons.ts` to fetch favicons
- [ ] Notify user to run migration and script

# Switch Translation Model to Gemini

- [x] Uninstall `openai` and install `@google/generative-ai`
- [x] Refactor `src/services/aiParser.ts` to use Gemini
- [x] Update `env.example.txt`
- [ ] Verify functionality
