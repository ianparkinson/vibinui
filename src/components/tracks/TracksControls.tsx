import React, { FC, useEffect } from "react";
import { ActionIcon, Box, Flex, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSquareX } from "@tabler/icons";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    resetTracksToDefaults,
    setTracksCardGap,
    setTracksCardSize,
    setTracksFilterText,
    setTracksFollowCurrentlyPlaying,
    setTracksLyricsSearchText,
    setTracksShowDetails,
} from "../../app/store/userSettingsSlice";
import { RootState } from "../../app/store/store";
import { useGetTracksQuery } from "../../app/services/vibinTracks";
import { useAppGlobals } from "../../app/hooks/useAppGlobals";
import CardControls from "../shared/CardControls";
import FilterInstructions from "../shared/FilterInstructions";
import ShowCountLabel from "../shared/ShowCountLabel";
import PlayMediaIdsButton from "../shared/PlayMediaIdsButton";
import CurrentlyPlayingButton from "../shared/CurrentlyPlayingButton";
import FollowCurrentlyPlayingToggle from "../shared/FollowCurrentlyPlayingToggle";

const lyricsSearchFinder = new RegExp(/(lyrics?):(\([^)]+?\)|[^( ]+)/);
const stripParens = new RegExp(/^\(?([^\)]+)\)?$/);

type TracksControlsProps = {
    scrollToCurrent?: () => void;
}

const TracksControls: FC<TracksControlsProps> = ({ scrollToCurrent }) => {
    const dispatch = useAppDispatch();
    const { STYLE_LABEL_BESIDE_COMPONENT } = useAppGlobals();
    const { data: allTracks } = useGetTracksQuery();
    const { cardSize, cardGap, filterText, followCurrentlyPlaying, showDetails } = useAppSelector(
        (state: RootState) => state.userSettings.tracks
    );
    const { filteredTrackMediaIds } = useAppSelector((state: RootState) => state.internal.tracks);
    const [debouncedFilterText] = useDebouncedValue(filterText, 250);
    const currentTrackMediaId = useAppSelector(
        (state: RootState) => state.playback.current_track_media_id
    );

    /**
     * Auto-scroll to the current entry when the current entry changes, and if the "follow" feature
     * is enabled. The goal is to keep the current entry near the top of the playlist while the
     * playlist screen remains open.
     */
    useEffect(() => {
        followCurrentlyPlaying &&
            currentTrackMediaId &&
            scrollToCurrent &&
            setTimeout(() => scrollToCurrent(), 1);
    }, [followCurrentlyPlaying, currentTrackMediaId, scrollToCurrent]);

    /**
     * Disable following the currently-playing album if an incomplete list of albums be currently
     * being displayed (e.g. a filter is active).
     */
    useEffect(() => {
        if (filterText !== "") {
            dispatch(setTracksFollowCurrentlyPlaying(false));
        }
    }, [filterText, dispatch]);

    // If the filter text includes something like "lyric:(some lyric search)" then store
    // "some lyric search" in application state.
    useEffect(() => {
        const lyricSearch = debouncedFilterText.toLocaleLowerCase().match(lyricsSearchFinder);

        if (lyricSearch) {
            const searchNoParens = lyricSearch[2].match(stripParens);

            dispatch(
                setTracksLyricsSearchText(searchNoParens ? searchNoParens[1] : lyricSearch[2])
            );
        } else {
            dispatch(setTracksLyricsSearchText(""));
        }
    }, [debouncedFilterText, dispatch]);

    return (
        <Flex gap={25} align="center">
            {/* Filter text */}
            {/* TODO: Consider debouncing setTracksFilterText() if performance is an issue */}
            <Flex gap={10} align="center" sx={{ flexGrow: 1 }}>
                <TextInput
                    placeholder="Title filter, or advanced"
                    label="Filter"
                    value={filterText}
                    rightSection={
                        <ActionIcon
                            disabled={!filterText}
                            onClick={() => dispatch(setTracksFilterText(""))}
                        >
                            <IconSquareX size="1.3rem" style={{ display: "block", opacity: 0.5 }} />
                        </ActionIcon>
                    }
                    onChange={(event) => dispatch(setTracksFilterText(event.target.value))}
                    styles={{
                        root: {
                            ...STYLE_LABEL_BESIDE_COMPONENT.root,
                            flexGrow: 1,
                        },
                        wrapper: {
                            flexGrow: 1,
                        },
                    }}
                />

                <FilterInstructions
                    defaultKey="title"
                    supportedKeys={["title", "album", "artist", "genre", "date", "lyrics"]}
                    examples={[
                        "favorite track",
                        "brick artist:(the eager) date:2004",
                        "lyrics:(crazy diamond)",
                    ]}
                    note={
                        "Lyrics searches are limited to tracks which have already had their " +
                        "lyrics retrieved by the Vibin backend."
                    }
                />
            </Flex>

            <Flex gap={20} align="center">
                {/* Buttons to show and follow currently-playing */}
                <Flex gap={5} align="center">
                    <CurrentlyPlayingButton
                        disabled={filterText !== ""}
                        tooltipLabel="Show currently playing Track"
                        onClick={() => scrollToCurrent && scrollToCurrent()}
                    />

                    <FollowCurrentlyPlayingToggle
                        isOn={followCurrentlyPlaying}
                        disabled={filterText !== ""}
                        tooltipLabel="Follow currently playing Track"
                        onClick={() =>
                            dispatch(setTracksFollowCurrentlyPlaying(!followCurrentlyPlaying))
                        }
                    />
                </Flex>

                {/* Play the currently-filtered tracks */}
                <Box pl={15}>
                    <PlayMediaIdsButton
                        mediaIds={filteredTrackMediaIds}
                        disabled={filterText === ""}
                        tooltipLabel={`Replace Playlist with ${
                            filteredTrackMediaIds.length < (allTracks?.length || 0)
                                ? filteredTrackMediaIds.length.toLocaleString()
                                : ""
                        } filtered Tracks (10 max)`}
                        menuItemLabel="Replace Playlist with filtered Tracks"
                        notificationLabel={`Playlist replaced with ${filteredTrackMediaIds.length.toLocaleString()} filtered Tracks`}
                        maxToPlay={100}
                    />
                </Box>
            </Flex>

            <Flex gap={20} justify="right" sx={{ alignSelf: "flex-end" }}>
                {/* "Showing x of y tracks" */}
                <ShowCountLabel
                    showing={filteredTrackMediaIds.length}
                    of={allTracks?.length || 0}
                    type="tracks"
                />

                {/* Card display settings */}
                <CardControls
                    cardSize={cardSize}
                    cardGap={cardGap}
                    showDetails={showDetails}
                    cardSizeSetter={setTracksCardSize}
                    cardGapSetter={setTracksCardGap}
                    showDetailsSetter={setTracksShowDetails}
                    resetter={resetTracksToDefaults}
                />
            </Flex>
        </Flex>
    );
};

export default TracksControls;
