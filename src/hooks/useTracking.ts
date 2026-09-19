import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listMyEntries, setGameStatus, type SetStatusInput } from "@/lib/tracking.functions";
import type { GameEntry } from "@/lib/tracking/types";

export const MY_ENTRIES_KEY = ["myGameEntries"] as const;

/** Everything the signed-in person tracks. Empty (and idle) when signed out. */
export function useMyEntries(enabled: boolean) {
  const fetchEntries = useServerFn(listMyEntries);

  return useQuery({
    queryKey: MY_ENTRIES_KEY,
    queryFn: () => fetchEntries(),
    enabled,
    staleTime: 30 * 1000,
  });
}

/** Add, move, or remove a game in the signed-in person's library. */
export function useSetGameStatus() {
  const queryClient = useQueryClient();
  const save = useServerFn(setGameStatus);

  return useMutation({
    mutationFn: (input: SetStatusInput) => save({ data: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: MY_ENTRIES_KEY });
      const previous = queryClient.getQueryData<GameEntry[]>(MY_ENTRIES_KEY);

      if (previous) {
        const withoutGame = previous.filter((entry) => entry.igdbId !== input.igdbId);
        queryClient.setQueryData<GameEntry[]>(
          MY_ENTRIES_KEY,
          input.status === null
            ? withoutGame
            : [
                {
                  igdbId: input.igdbId,
                  gameSlug: input.gameSlug,
                  title: input.title,
                  coverUrl: input.coverUrl ?? null,
                  status: input.status,
                  updatedAt: new Date().toISOString(),
                },
                ...withoutGame,
              ],
        );
      }

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(MY_ENTRIES_KEY, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: MY_ENTRIES_KEY });
    },
  });
}
