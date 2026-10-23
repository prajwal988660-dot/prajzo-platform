// Settings read when the web app is built (they are not secrets). See docs/ENVIRONMENT.md.
interface ImportMetaEnv {
  /** "true" forces right-click and image-drag blocking on, "false" off. Unset: on in production builds only. */
  readonly VITE_PROTECT_CONTENT?: string;
}
