import integrations from "../src/index";

console.log(JSON.stringify(await integrations.health(), null, 2));
