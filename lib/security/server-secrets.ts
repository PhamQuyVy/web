import "server-only";

export function optionalServerSecret(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

export function requiredServerSecret(name: string) {
  const value = optionalServerSecret(name);
  if (!value) {
    throw new Error(`Missing server secret: ${name}`);
  }

  return value;
}

export function hasServerSecret(name: string) {
  return Boolean(optionalServerSecret(name));
}
