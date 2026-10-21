import { createApp } from './app.js';
import { createCalendar } from './calendar/index.js';
import { config } from './config.js';

const app = createApp(createCalendar());
app.listen(config.PORT, () => console.log(`Pacific Coast Auto receptionist API listening on http://localhost:${config.PORT}`));
