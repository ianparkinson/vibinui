import React, { FC, RefObject, useEffect, useRef, useState } from "react";
import { QueryStatus } from "@reduxjs/toolkit/query";
import { Box, Center, createStyles, Loader } from "@mantine/core";

import { Album } from "../../../app/types";
import type { RootState } from "../../../app/store/store";
import AlbumCard from "./AlbumCard";
import SadLabel from "../../shared/textDisplay/SadLabel";
import { useAppDispatch, useAppSelector } from "../../../app/hooks/store";
import { useGetAlbumsQuery, useGetNewAlbumsQuery } from "../../../app/services/vibinAlbums";
import { setFilteredAlbumMediaIds } from "../../../app/store/internalSlice";
import { useAppGlobals } from "../../../app/hooks/useAppGlobals";
import { collectionFilter } from "../../../app/utils";

// ================================================================================================
// Show a wall of Album art. Reacts to display properties configured via <AlbumsControls>.
// ================================================================================================

type AlbumWallProps = {
    onNewCurrentAlbumRef: (ref: RefObject<HTMLDivElement>) => void;
}

const AlbumsWall: FC<AlbumWallProps> = ({ onNewCurrentAlbumRef }) => {
    const dispatch = useAppDispatch();
    const { SCREEN_LOADING_PT } = useAppGlobals();
    const filterText = useAppSelector((state: RootState) => state.userSettings.albums.filterText);
    const currentAlbumRef = useRef<HTMLDivElement>(null);
    const { activeCollection, cardSize, cardGap } = useAppSelector(
        (state: RootState) => state.userSettings.albums
    );
    const currentAlbumMediaId = useAppSelector(
        (state: RootState) => state.playback.current_album_media_id
    );
    const {
        data: allAlbums,
        error: allError,
        isLoading: allIsLoading,
        status: allStatus,
    } = useGetAlbumsQuery();
    const {
        data: newAlbums,
        error: newError,
        isLoading: newIsLoading,
        status: newStatus,
    } = useGetNewAlbumsQuery();
    const [calculatingAlbumsToDisplay, setCalculatingAlbumsToDisplay] = useState<boolean>(true);
    const [albumsToDisplay, setAlbumsToDisplay] = useState<Album[]>([]);

    const { classes: dynamicClasses } = createStyles((theme) => ({
        albumWall: {
            display: "grid",
            gap: cardGap,
            gridTemplateColumns: `repeat(auto-fit, ${cardSize}px)`,
            paddingBottom: 15,
        },
    }))();

    useEffect(() => {
        setCalculatingAlbumsToDisplay(true);
    }, [activeCollection]);

    useEffect(() => {
        setCalculatingAlbumsToDisplay(false);
    }, [albumsToDisplay]);

    /**
     * Inform the caller of the currentAlbumRef on mount. The currentAlbumRef will be attached to
     * the card representing the currently-playing Album. This ref will move from card to card
     * over time (as the Album changes).
     */
    useEffect(() => {
        onNewCurrentAlbumRef(currentAlbumRef);
    }, [onNewCurrentAlbumRef]);

    /**
     * Determine which Albums to display. This takes into account the current "All Albums"/"New
     * Albums" selection, and any filter text
     */
    useEffect(() => {
        if (allStatus === QueryStatus.rejected) {
            // Inability to retrieve All Albums is considered a significant-enough problem to stop
            // trying to proceed. Inability to retrieve New Albums isn't as severe.
            setCalculatingAlbumsToDisplay(false);
            return;
        }

        if (!allAlbums) {
            return;
        }

        setCalculatingAlbumsToDisplay(true);

        // Decide which collection to show. This will either be all albums; new albums; or just the
        // album currently playing.

        const collection =
            activeCollection === "all" ? allAlbums : activeCollection === "new" ? newAlbums : [];

        const albumsToDisplay = collectionFilter(collection || [], filterText, "title");

        dispatch(setFilteredAlbumMediaIds(albumsToDisplay.map((album) => album.id)));
        setAlbumsToDisplay(albumsToDisplay);
    }, [allAlbums, allStatus, newAlbums, filterText, activeCollection, dispatch]);

    // --------------------------------------------------------------------------------------------

    if (calculatingAlbumsToDisplay || allIsLoading || newIsLoading) {
        return (
            <Center pt={SCREEN_LOADING_PT}>
                <Loader variant="dots" size="md" />
            </Center>
        );
    }

    if (allStatus === QueryStatus.rejected) {
        return (
            <Center pt="xl">
                <SadLabel label="Could not locate All Albums. Is the Media Server path correct?" />
            </Center>
        );
    }

    if (activeCollection === "new" && newStatus === QueryStatus.rejected) {
        return (
            <Center pt="xl">
                <SadLabel label="Could not locate New Albums. Is the Media Server path correct?" />
            </Center>
        );
    }

    if ((activeCollection === "all" && allError) || (activeCollection === "new" && newError)) {
        return (
            <Center pt="xl">
                <SadLabel label="Error retrieving Album details" />
            </Center>
        );
    }

    if (albumsToDisplay.length <= 0) {
        return (
            <Center pt="xl">
                <SadLabel label={filterText === "" ? "No Albums available" : "No matching Albums"} />
            </Center>
        );
    }

    // --------------------------------------------------------------------------------------------

    return (
        <Box className={dynamicClasses.albumWall}>
            {albumsToDisplay.map((album: Album) =>
                album.id === currentAlbumMediaId ? (
                    <Box key={album.id} ref={currentAlbumRef}>
                        <AlbumCard album={album} />
                    </Box>
                ) : (
                    <AlbumCard key={album.id} album={album} />
                )
            )}
        </Box>
    );
};

export default AlbumsWall;
