import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28 }} className="items-center justify-center bg-brand">
      <Ionicons name="basket" size={size * 0.55} color="#FFFFFF" />
    </View>
  );
}
