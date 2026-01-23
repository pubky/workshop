export function divider(title) {
  const line = "─".repeat(72);
  console.log(`\n${line}\n${title}\n${line}`);
}

export function info(label, value = "") {
  const suffix = value ? ` ${value}` : "";
  console.log(`• ${label}${suffix}`);
}

export function callout(text) {
  console.log(`✨ ${text}`);
}
