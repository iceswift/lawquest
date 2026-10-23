const fs = require('fs');
const path = require('path');

const savedPath = path.join('d:', 'Project', 'LawQuest', 'app', '(tabs)', 'saved.tsx');
let content = fs.readFileSync(savedPath, 'utf8');

// 1. Remove the old inline filterLedgerSheet
const startMarker = `{/* Collapsible Filter Ledger Sheet */}`;
const endMarker = `        )}` + '\n' + `      </View>` + '\n' + `    );`;

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  // Find the closing of showFilters && ( ... )
  const closeMarker = `      </View>\n    );\n  }, [`;
  const endIndex = content.indexOf(closeMarker, startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
  } else {
    console.log("Could not find endIndex for old filter");
  }
} else {
  console.log("Could not find startIndex for old filter");
}

// 2. Add the Bottom Sheet Modal before the final `</View>` of SavedScreen
const savedScreenEndMarker = `      )}` + '\n' + `    </View>` + '\n' + `  );` + '\n' + `}`;
const modalInjectIndex = content.lastIndexOf(savedScreenEndMarker);

const bottomSheetModal = `
      {/* Bottom Sheet Filter Modal */}
      {showFilters && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
          transparent
          visible
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            style={styles.modalBackdrop}
            tint={isDark ? "dark" : "light"}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFillObject}
              onPress={() => setShowFilters(false)}
            />
            <View
              style={[
                styles.bottomSheetPanel,
                { backgroundColor: colors.card, borderColor: colors.glassBorder },
              ]}
            >
              <View style={[styles.bottomSheetHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }]} />
              
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.regal }]}>
                  Filter Archives
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity activeOpacity={0.7} onPress={resetFilters}>
                    <Text style={[styles.resetTextInline, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                      Reset All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}>
                {/* Collection */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>COLLECTION</Text>
                <View style={styles.filterGrid}>
                  <FilterOption
                    active={selectedCollectionFilter === "all"}
                    label="All Saved"
                    onPress={() => setSelectedCollectionFilter("all")}
                  />
                  <FilterOption
                    active={selectedCollectionFilter === "pinned"}
                    label="Pinned Only"
                    onPress={() => setSelectedCollectionFilter("pinned")}
                  />
                  {availableFolders.map((folder) => (
                    <FilterOption
                      key={\`folder:\${folder}\`}
                      active={selectedCollectionFilter === \`folder:\${folder}\`}
                      label={\`📂 \${folder}\`}
                      onPress={() => setSelectedCollectionFilter(\`folder:\${folder}\`)}
                    />
                  ))}
                  {availableTags.map((tag) => (
                    <FilterOption
                      key={\`tag:\${tag}\`}
                      active={selectedCollectionFilter === \`tag:\${tag}\`}
                      label={\`#\${tag}\`}
                      onPress={() => setSelectedCollectionFilter(\`tag:\${tag}\`)}
                    />
                  ))}
                </View>

                {/* Status */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>LEGAL STATUS</Text>
                <View style={styles.filterGrid}>
                  <FilterOption
                    active={selectedSourceFilter === "all"}
                    label="All Status"
                    onPress={() => setSelectedSourceFilter("all")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "authoritative"}
                    label="Authoritative"
                    onPress={() => setSelectedSourceFilter("authoritative")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "needsReview"}
                    label="Needs Review"
                    onPress={() => setSelectedSourceFilter("needsReview")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "englishReference"}
                    label="English Reference"
                    onPress={() => setSelectedSourceFilter("englishReference")}
                  />
                </View>

                {/* Language */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>LANGUAGE</Text>
                <View style={styles.filterGrid}>
                  <FilterOption
                    active={selectedLanguageFilter === ALL_FILTER_VALUE}
                    label="All Languages"
                    onPress={() => setSelectedLanguageFilter(ALL_FILTER_VALUE)}
                  />
                  {availableLanguages.map((language) => (
                    <FilterOption
                      key={language}
                      active={selectedLanguageFilter === language}
                      label={\`\${getLanguageFlag(language)} \${language.toUpperCase()}\`}
                      onPress={() => setSelectedLanguageFilter(language)}
                    />
                  ))}
                </View>

                {/* Law Code */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>LAW CODE</Text>
                <View style={styles.filterGrid}>
                  <FilterOption
                    active={selectedCodeFilter === ALL_FILTER_VALUE}
                    label="All Codes"
                    onPress={() => setSelectedCodeFilter(ALL_FILTER_VALUE)}
                  />
                  {availableCodebooks.map((code) => (
                    <FilterOption
                      key={code.codeId}
                      active={selectedCodeFilter === code.codeId}
                      label={code.title}
                      onPress={() => setSelectedCodeFilter(code.codeId)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
      )}
`;

if (modalInjectIndex !== -1) {
  content = content.substring(0, modalInjectIndex) + bottomSheetModal + content.substring(modalInjectIndex);
} else {
  console.log("Could not find modalInjectIndex");
}

// 3. Add FilterOption function
const filterChipMarker = `function FilterChip({`;
const filterOptionCode = `
function FilterOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors, tintColor, typography, isDark } = useAppTheme();
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.filterOption,
        {
          backgroundColor: active ? tintColor + "1A" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderColor: active ? tintColor + "60" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <Text
        style={[
          styles.filterOptionText,
          { color: active ? tintColor : colors.subtext, fontFamily: typography.fonts.bold },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active && <Ionicons name="checkmark-circle" size={14} color={tintColor} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );
}

`;

const filterChipIndex = content.indexOf(filterChipMarker);
if (filterChipIndex !== -1) {
  content = content.substring(0, filterChipIndex) + filterOptionCode + content.substring(filterChipIndex);
} else {
  console.log("Could not find filterChipIndex");
}

// 4. Add CSS styles
const stylesMarker = `const styles = StyleSheet.create({`;
const cssInject = `
  bottomSheetPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: "85%",
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  bottomSheetTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  filterGroupTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
  },
`;

const stylesIndex = content.indexOf(stylesMarker);
if (stylesIndex !== -1) {
  content = content.substring(0, stylesIndex + stylesMarker.length) + cssInject + content.substring(stylesIndex + stylesMarker.length);
} else {
  console.log("Could not find stylesIndex");
}

fs.writeFileSync(savedPath, content, 'utf8');
console.log("Successfully updated saved.tsx");
