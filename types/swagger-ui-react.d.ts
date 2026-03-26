declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  const SwaggerUI: ComponentType<{ url?: string; spec?: object }>;
  export default SwaggerUI;
}
