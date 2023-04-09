// This is mostly taken from Mantine's useWindowScroll():
//  https://github.com/mantinedev/mantine/blob/master/src/mantine-hooks/src/use-window-scroll/use-window-scroll.ts
//
// This exists to add support for debouncing the window scroll events, and to use "auto" (instant)
// scroll behavior (instead of "smooth").

import { useEffect } from "react";
import { useDebouncedState, useWindowEvent } from "@mantine/hooks";

interface ScrollPosition {
    x: number;
    y: number;
}

function getScrollPosition(): ScrollPosition {
    return typeof window !== "undefined"
        ? { x: window.pageXOffset, y: window.pageYOffset }
        : { x: 0, y: 0 };
}

function scrollTo({ x, y }: Partial<ScrollPosition>) {
    if (typeof window !== "undefined") {
        const scrollOptions: ScrollToOptions = { behavior: "auto" };

        if (typeof x === "number") {
            scrollOptions.left = x;
        }

        if (typeof y === "number") {
            scrollOptions.top = y;
        }

        window.scrollTo(scrollOptions);
    }
}

export function useWindowScroll(options?: Partial<{ delay: number }>) {
    const [position, setPosition] = useDebouncedState<ScrollPosition>(
        { x: 0, y: 0 },
        options?.delay || 500
    );

    useWindowEvent("scroll", () => setPosition(getScrollPosition()));
    useWindowEvent("resize", () => setPosition(getScrollPosition()));

    useEffect(() => {
        setPosition(getScrollPosition());
    }, []);

    return [position, scrollTo] as const;
}