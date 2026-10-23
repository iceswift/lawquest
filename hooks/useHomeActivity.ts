import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import {
  HomeActivitySnapshot,
  readHomeActivity,
} from "@/services/homeActivity";

const EMPTY_HOME_ACTIVITY: HomeActivitySnapshot = {
  recentNotes: [],
  recentlyViewedSections: [],
};

export function useHomeActivity(limit = 3) {
  const [activity, setActivity] =
    useState<HomeActivitySnapshot>(EMPTY_HOME_ACTIVITY);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      setActivity(await readHomeActivity(limit));
    } catch (error) {
      console.warn("Failed to load home activity", error);
      setActivity(EMPTY_HOME_ACTIVITY);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadActivity = async () => {
        setIsLoading(true);

        try {
          const nextActivity = await readHomeActivity(limit);

          if (isActive) {
            setActivity(nextActivity);
          }
        } catch (error) {
          console.warn("Failed to load home activity", error);

          if (isActive) {
            setActivity(EMPTY_HOME_ACTIVITY);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadActivity();

      return () => {
        isActive = false;
      };
    }, [limit]),
  );

  return {
    ...activity,
    isLoading,
    refresh,
  };
}
