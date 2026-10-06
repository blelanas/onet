import { createApp } from "@api/app";
import { env } from "@api/env";

createApp().listen(env.PORT, () => {
  console.log(`ONET API listening on :${env.PORT} (${env.NODE_ENV})`);
});
