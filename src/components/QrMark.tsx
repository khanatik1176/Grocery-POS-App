import qrcode from "qrcode-generator";
import { View } from "react-native";

export function QrMark({ value }: { value: string }) {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  const count = code.getModuleCount();
  const cell = Math.max(3, Math.floor(180 / count));
  return (
    <View className="self-center rounded-xl border border-line bg-white p-3">
      {Array.from({ length: count }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: count }, (_, column) => (
            <View
              key={column}
              style={{
                width: cell,
                height: cell,
                backgroundColor: code.isDark(row, column) ? "#101828" : "#ffffff",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
