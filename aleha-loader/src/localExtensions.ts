export interface LocalExtension {
  name: string;
  code: string;
}

export const LOCAL_EXTENSION_MODE = false;

const localExtensions: LocalExtension[] = [];

export default localExtensions;
