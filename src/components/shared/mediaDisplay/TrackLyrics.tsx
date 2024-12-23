import React, { FC, useEffect, useState } from "react";
import {
    Box,
    Button,
    createStyles,
    Flex,
    Highlight,
    Stack,
    Text,
    useMantineTheme,
} from "@mantine/core";

import {
    LyricChunk,
    Lyrics,
    useLazyGetLyricsQuery,
    useLazyValidateLyricsQuery,
} from "../../../app/services/vibinTracks";
import LoadingDataMessage from "../textDisplay/LoadingDataMessage";
import SadLabel from "../textDisplay/SadLabel";
import { getTextWidth } from "../../../app/utils";
import { useAppGlobals } from "../../../app/hooks/useAppGlobals";
import { useAppSelector } from "../../../app/hooks/store";
import { RootState } from "../../../app/store/store";

// ================================================================================================
// Show lyrics for the provided Track.
//
// Accepts either a track id (for local media) or an artist/title pair (for alternate sources like
// AirPlay). Lyrics can be marked as invalid, or can be re-retrieved from the backend.
//
// Lyrics are rendered in a CSS grid, which should add columns if the container is widened.
// ================================================================================================

// TODO: Make these mutually exclusive. The intent is to pass one of either track, trackId, or
//  artist & title.
type TrackLyricsProps = {
    trackId?: string;
    artist?: string;
    title?: string;
};

const TrackLyrics: FC<TrackLyricsProps> = ({ trackId, artist, title }) => {
    const { colors } = useMantineTheme();
    const { APP_ALT_FONTFACE } = useAppGlobals();
    const [lyrics, setLyrics] = useState<Lyrics | undefined>(undefined);
    const [maxLineWidth, setMaxLineWidth] = useState<number>(0);
    const [showInvalidLyrics, setShowInvalidLyrics] = useState<boolean>(false);
    const { lyricsSearchText } = useAppSelector((state: RootState) => state.userSettings.tracks);
    const [validateLyrics] = useLazyValidateLyricsQuery();
    const [getLyrics, getLyricsStatus] = useLazyGetLyricsQuery();

    const { classes: dynamicClasses } = createStyles((theme) => ({
        lyricsContainer: {
            columnCount: "auto",
            columnWidth: maxLineWidth,
            columnFill: "balance",
        },
        chunkHeader: {
            fontFamily: APP_ALT_FONTFACE,
            fontWeight: "bold",
        },
        chunkBody: {
            fontFamily: APP_ALT_FONTFACE,
            color: theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.dark[5],
        },
    }))();

    /**
     * Retrieve new lyrics whenever the current Track changes -- either by Id (for local media)
     * or by artist/title (for other sources like AirPlay)..
     */
    useEffect(() => {
        getLyrics({ trackId, artist, title });
    }, [getLyrics, trackId, artist, title]);

    /**
     * Store lyrics in component state for rendering.
     *
     * Also, calculate the maximum line length, which will be used to set the column width. This
     * means that all columns will be the width of the widest line (regardless of column), which
     * isn't ideal -- especially if there's one very long line relative to the others.
     */
    useEffect(() => {
        if (!getLyricsStatus.data) {
            return;
        }

        setLyrics(getLyricsStatus.data);

        const allLineWidths = getLyricsStatus.data.chunks
            .map((chunk) => [
                getTextWidth(chunk.header || ""),
                ...chunk.body.map((line) => getTextWidth(line)),
            ])
            .flat(1);

        setMaxLineWidth(Math.max(...allLineWidths));
    }, [getLyricsStatus.data]);

    if (getLyricsStatus.isFetching || getLyricsStatus.isLoading) {
        return <LoadingDataMessage message="Retrieving lyrics..." />;
    }

    if (
        // TODO: Define vibin's error response types in the RTK Query endpoint definitions.
        //  https://redux-toolkit.js.org/rtk-query/usage-with-typescript
        getLyricsStatus.status === "rejected" &&
        // @ts-ignore
        getLyricsStatus.error?.status === 404 &&
        // @ts-ignore
        getLyricsStatus.error?.data?.detail.includes("missing dependency")
    ) {
        return (
            <Text size={14} color={colors.dark[2]}>
                Lyrics are not supported by the Vibin backend. Genius token required.
            </Text>
        );
    }

    if (!lyrics || lyrics.chunks.length <= 0) {
        return (
            <Stack spacing={20}>
                <SadLabel label="No lyrics found" labelSize={14} weight="normal" />
                <Button
                    compact
                    variant="light"
                    size="xs"
                    w="10rem"
                    onClick={() => getLyrics({ trackId, artist, title, updateCache: true })}
                >
                    Retry from Genius
                </Button>
            </Stack>
        );
    }

    if (!lyrics.is_valid && !showInvalidLyrics) {
        return (
            <Stack align="self-start">
                <Text size="sm" weight="bold" transform="uppercase">
                    Lyrics marked as invalid
                </Text>
                <Button
                    compact
                    variant="light"
                    size="xs"
                    w="7rem"
                    onClick={() => setShowInvalidLyrics(true)}
                >
                    Show Anyway
                </Button>
            </Stack>
        );
    }

    /**
     * Render a single chunk. A chunk is usually a single verse, chorus, etc, but can sometimes be
     * something like "(Instrumental break)". Headers (if present) are rendered in bold, whereas
     * the body is rendered as normal text.
     */
    const chunkRender = (chunk: LyricChunk, chunkIndex: number) => {
        return (
            <Box key={`chunk_${chunkIndex}`}>
                {chunk.header && (
                    <Highlight className={dynamicClasses.chunkHeader} highlight={lyricsSearchText}>
                        {chunk.header}
                    </Highlight>
                )}

                <Box pb={15}>
                    {chunk.body.map((line, lineIndex) => (
                        <Highlight
                            key={`line_${chunkIndex}_${lineIndex}`}
                            className={dynamicClasses.chunkBody}
                            highlight={lyricsSearchText}
                        >
                            {line}
                        </Highlight>
                    ))}
                </Box>
            </Box>
        );
    };

    return (
        <Stack>
            <Flex gap={10}>
                {!lyrics.is_valid && (
                    // Hide the lyrics
                    <Button
                        compact
                        variant="light"
                        size="xs"
                        w="9rem"
                        onClick={() => setShowInvalidLyrics(false)}
                    >
                        Hide Invalid Lyrics
                    </Button>
                )}

                {/* Mark as Valid/Invalid */}
                <Button
                    compact
                    variant="light"
                    size="xs"
                    w="7rem"
                    onClick={() =>
                        lyrics.is_valid !== undefined &&
                        validateLyrics({
                            trackId,
                            artist,
                            title,
                            isValid: !lyrics.is_valid,
                        }).then(() => getLyrics({ trackId, artist, title }))
                    }
                >
                    {`Mark as ${lyrics.is_valid ? "Invalid" : "Valid"}`}
                </Button>

                {/* Refresh from Genius */}
                <Button
                    compact
                    variant="light"
                    size="xs"
                    w="10rem"
                    onClick={() => getLyrics({ trackId, artist, title, updateCache: true })}
                >
                    Refresh from Genius
                </Button>
            </Flex>
            <Box className={dynamicClasses.lyricsContainer}>{lyrics.chunks.map(chunkRender)}</Box>
        </Stack>
    );
};

export default TrackLyrics;
