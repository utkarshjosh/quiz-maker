# Database Seeding Structure

This directory contains the seeding scripts for the Quiz Maker application's database. The seeding process is organized into separate modules for better maintainability and scalability.

## Directory Structure

```
seeds/
├── data/                 # JSON data files for seeding
│   ├── users.json       # User seed data
│   ├── tags.json        # Tag categories and metadata
│   ├── quizzes.json     # Initial quiz data
│   └── quiz-tags.json   # Quiz-tag relationships
├── users.ts             # User seeding logic
├── tags.ts             # Tag seeding logic
├── quizzes.ts          # Quiz seeding logic
├── quiz-tags.ts        # Quiz-tag relationship seeding logic
├── large-quiz-dataset.ts # Large dataset seeding logic
└── index.ts            # Main seeding orchestrator
```

## Seeding Process

1. The seeding process is orchestrated by `index.ts`
2. Core data (users, tags, initial quizzes) is seeded within a transaction
3. Large dataset is seeded separately in batches to manage memory usage

## Running Seeds

```bash
# Run all seeds
npm run prisma:seed

# Reset database and run seeds
npm run prisma:seed:reset
```

## Adding New Seeds

1. Create a JSON data file in `data/`
2. Create a corresponding TypeScript seeding module
3. Import and add the seeding function to `index.ts`

## Best Practices

1. Use `createMany` for better performance
2. Handle date conversions and JSON stringification
3. Use `skipDuplicates: true` to prevent errors on re-runs
4. Process large datasets in batches
5. Keep seed data modular and organized 