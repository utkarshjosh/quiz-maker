import { main } from './seeds';

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
