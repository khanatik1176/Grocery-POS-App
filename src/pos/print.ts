import { Platform } from "react-native";

type PrintWindow = {
  document: { write: (html: string) => void; close: () => void };
  focus: () => void;
  print: () => void;
};

export async function printHtml(html: string) {
  if (Platform.OS === "web") {
    const opener = globalThis as typeof globalThis & { open?: (url: string, target: string) => PrintWindow | null };
    const page = opener.open?.("", "_blank");
    if (!page) {
      return false;
    }
    page.document.write(html);
    page.document.close();
    page.focus();
    page.print();
    return true;
  }
  const printer = await import("expo-print");
  await printer.printAsync({ html });
  return true;
}
