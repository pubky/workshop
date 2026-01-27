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

export function pkdnsUrl(publicKeyZ32) {
  return `https://pkdns.net/?id=${publicKeyZ32}`;
}

export function explorerUrl(pubkyOrResource, path = "") {
  if (path) {
    const id = pubkyOrResource.split("/")[0];
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `https://explorer.pubky.app/#p=${encodeURIComponent(`${id}${suffix}`)}`;
  }
  return `https://explorer.pubky.app/#p=${encodeURIComponent(pubkyOrResource)}`;
}
