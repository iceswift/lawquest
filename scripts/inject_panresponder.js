const fs = require('fs');
const path = require('path');

const savedPath = path.join('d:', 'Project', 'LawQuest', 'app', '(tabs)', 'saved.tsx');
let content = fs.readFileSync(savedPath, 'utf8');

// 1. Add useRef to react imports
if (content.includes('import React, { memo, useCallback, useEffect, useMemo, useState }')) {
  content = content.replace(
    'import React, { memo, useCallback, useEffect, useMemo, useState }',
    'import React, { memo, useCallback, useEffect, useMemo, useState, useRef }'
  );
} else if (!content.includes('useRef')) {
  content = content.replace('useState } from "react";', 'useState, useRef } from "react";');
}

// 2. Add Animated and PanResponder to react-native imports
if (content.includes('Modal,')) {
  content = content.replace(
    'Modal,',
    'Modal,\n    Animated,\n    PanResponder,'
  );
}

// 3. Add PanResponder logic inside SavedScreen
const hookInjectionPoint = `const [searchQuery, setSearchQuery] = useState("");`;
const panResponderCode = `
  // Bottom Sheet PanResponder
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 1.5) {
          // Swipe down detected, close modal
          Animated.timing(panY, {
            toValue: Dimensions.get("window").height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowFilters(false);
            // Reset after modal unmounts
            setTimeout(() => panY.setValue(0), 100);
          });
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
`;

if (!content.includes('const panY = useRef')) {
  content = content.replace(hookInjectionPoint, hookInjectionPoint + '\n' + panResponderCode);
}

// 4. Change <View> to <Animated.View> for the bottom sheet panel
const bottomSheetPanelStart = `<View
              style={[
                styles.bottomSheetPanel,
                { backgroundColor: isDark ? "rgba(22, 25, 34, 0.75)" : "rgba(255, 255, 255, 0.85)", borderColor: colors.glassBorder },
              ]}
            >`;
const animatedBottomSheetPanelStart = `<Animated.View
              style={[
                styles.bottomSheetPanel,
                { backgroundColor: isDark ? "rgba(22, 25, 34, 0.75)" : "rgba(255, 255, 255, 0.85)", borderColor: colors.glassBorder },
                { transform: [{ translateY: panY.interpolate({ inputRange: [0, Dimensions.get("window").height], outputRange: [0, Dimensions.get("window").height], extrapolate: "clamp" }) }] }
              ]}
            >`;
content = content.replace(bottomSheetPanelStart, animatedBottomSheetPanelStart);

// Also close Animated.View correctly
// Find the exact closing </View> for the bottom sheet panel.
// It's the one right before </BlurView>
content = content.replace(
  `              </ScrollView>
            </View>
          </BlurView>`,
  `              </ScrollView>
            </Animated.View>
          </BlurView>`
);

// 5. Wrap the handle and header in a View with panHandlers
const handleAndHeader = `              <View style={[styles.bottomSheetHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }]} />
              
              <View style={[styles.bottomSheetHeader, { backgroundColor: "transparent" }]}>
                <Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                  ตัวกรองข้อมูล
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity activeOpacity={0.7} onPress={resetFilters} style={[styles.resetButtonInline, { backgroundColor: tintColor + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }]}>
                    <Text style={[styles.resetTextInline, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                      ล้างค่าทั้งหมด
                    </Text>
                  </TouchableOpacity>
                )}
              </View>`;

const pannedHandleAndHeader = `              <View {...panResponder.panHandlers} style={{ backgroundColor: "transparent" }}>
${handleAndHeader}
              </View>`;

if (!content.includes('panHandlers')) {
  content = content.replace(handleAndHeader, pannedHandleAndHeader);
}

fs.writeFileSync(savedPath, content, 'utf8');
console.log("Successfully injected PanResponder logic into saved.tsx");
