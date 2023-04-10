import React, { FC, useEffect } from "react";
import { Box, Stack } from "@mantine/core";

import { useAppGlobals } from "../../../app/hooks/useAppGlobals";
import { useAppDispatch, useAppSelector } from "../../../app/hooks/useInterval";
import { RootState } from "../../../app/store/store";
import { useWindowScroll } from "../../../app/hooks/useWindowScroll";
import { setFavoritesScrollPosition } from "../../../app/store/internalSlice";
import FavoritesControls from "../../features/favorites/FavoritesControls";
import FavoritesWall from "../../features/favorites/FavoritesWall";
import ScreenHeader from "../ScreenHeader";

const FavoritesScreen: FC = () => {
    const dispatch = useAppDispatch();
    const { SCREEN_HEADER_HEIGHT } = useAppGlobals();
    const { scrollPosition } = useAppSelector((state: RootState) => state.internal.favorites);
    const [scroll, scrollTo] = useWindowScroll({ delay: 500 });

    useEffect(() => {
        setTimeout(() => scrollTo({ y: scrollPosition }), 1);
    }, []);

    useEffect(() => {
        dispatch(setFavoritesScrollPosition(scroll.y));
    }, [scroll, dispatch]);

    return (
        <Stack spacing={0}>
            <ScreenHeader height={SCREEN_HEADER_HEIGHT}>
                <FavoritesControls />
            </ScreenHeader>
            <Box pt={SCREEN_HEADER_HEIGHT}>
                <FavoritesWall />
            </Box>
        </Stack>
    );
};

export default FavoritesScreen;