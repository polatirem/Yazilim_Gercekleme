import { useFonts } from "expo-font";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { IBMPlexSans_400Regular } from "@expo-google-fonts/ibm-plex-sans/400Regular";
import { IBMPlexSans_500Medium } from "@expo-google-fonts/ibm-plex-sans/500Medium";
import { IBMPlexSans_600SemiBold } from "@expo-google-fonts/ibm-plex-sans/600SemiBold";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { NavProvider } from "@/nav/router";
import { Shell } from "@/shell/Shell";
import { colors, fonts } from "@/ui/theme";

export default function App() {
  const [loaded, error] = useFonts({
    [fonts.display]: InstrumentSerif_400Regular,
    [fonts.displayItalic]: InstrumentSerif_400Regular_Italic,
    [fonts.ui]: IBMPlexSans_400Regular,
    [fonts.uiMedium]: IBMPlexSans_500Medium,
    [fonts.uiSemibold]: IBMPlexSans_600SemiBold,
    [fonts.mono]: IBMPlexMono_400Regular,
    [fonts.monoMedium]: IBMPlexMono_500Medium,
  });

  // A font failing to load must never block the game: the system font takes over.
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </SafeAreaProvider>
  );
}
