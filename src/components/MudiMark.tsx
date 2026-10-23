import { Text, View } from "react-native";

export function MudiMark({ size = 40 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
      className="items-center justify-center bg-saffron"
    >
      <Text style={{ fontSize: size * 0.46, lineHeight: size * 0.52 }} className="font-black text-ink">
        M
      </Text>
      <View
        style={{
          position: "absolute",
          right: size * 0.08,
          bottom: size * 0.08,
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size,
        }}
        className="bg-leaf"
      />
    </View>
  );
}
