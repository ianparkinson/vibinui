import React, { FC, useState } from "react";
import { Box, Card, Center, createStyles, Flex, Image, Menu, Stack, Text } from "@mantine/core";
import { IconDotsVertical, IconPlayerPlay } from "@tabler/icons";

import { Album } from "../../app/types";
import { useAddMediaToPlaylistMutation } from "../../app/services/vibinPlaylist";
import { useAppSelector } from "../../app/hooks";
import { RootState } from "../../app/store/store";

const useStyles = createStyles((theme) => ({
    cardPlayButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        border: "2px solid white",
        backgroundColor: "#151515",
        opacity: 0,
        "&:hover": {
            cursor: "pointer",
        },
    },
    showPlayButton: {
        opacity: 0.9,
        transition: "transform .2s ease-in-out, opacity .2s ease-in-out",
    },
    pointerOnHover: {
        "&:hover": {
            cursor: "pointer",
        },
    },
}));

const useMenuStyles = createStyles((theme) => ({
    item: {
        fontSize: 12,
        padding: "7px 12px",
        "&[data-hovered]": {
            backgroundColor: theme.colors[theme.primaryColor][theme.fn.primaryShade()],
            color: theme.white,
        },
    },
    // TODO: See if the pointerOnHover CSS can be defined here, since it's menu-specific. Note that
    //  trying to define a "target" key did not result in the desired behavior.
}));

type AlbumProps = {
    album: Album;
};

// TODO: Image fit is "cover", which will effectively zoom in on non-square album art. Could add
//  a prop to switch this to "contain" which will show the entire non-square art (and add
//  top/bottom or left/right bars as appropriate).

const AlbumCard: FC<AlbumProps> = ({ album }) => {
    const [showPlayButton, setShowPlayButton] = useState<boolean>(false);
    const [addMediaToPlaylist] = useAddMediaToPlaylistMutation();
    const { coverSize, showDetails } = useAppSelector(
        (state: RootState) => state.userSettings.browse
    );
    const { classes } = useStyles();
    const menuStyles = useMenuStyles();

    const { classes: dynamicClasses } = createStyles((theme) => ({
        albumCard: {
            width: coverSize,
            border: "2px solid rgb(0, 0, 0, 0)",
        },
        cardPlayButtonContainer: {
            position: "absolute",
            top: 0,
            left: 0,
            height: coverSize,
            width: "100%",
            transition: "transform .2s ease-in-out, background-color .2s ease-in-out",
            "&:hover": {
                backgroundColor: "rgb(0, 0, 0, 0.25)",
            },
        },
    }))();

    return (
        // pr (padding-right) is smaller to allow for the right-side whitespace coming from
        // IconDotsVertical.
        <Card radius="sm" p={7} pr={2} className={dynamicClasses.albumCard}>
            <Card.Section
                onMouseOver={() => setShowPlayButton(true)}
                onMouseLeave={() => setShowPlayButton(false)}
            >
                <Image
                    src={album.album_art_uri}
                    alt={`${album.artist} / ${album.title}`}
                    fit="cover"
                    width={coverSize}
                    height={coverSize}
                />
                <Center className={dynamicClasses.cardPlayButtonContainer}>
                    <Center
                        className={`${classes.cardPlayButton} ${
                            showPlayButton ? classes.showPlayButton : ""
                        }`}
                    >
                        <IconPlayerPlay
                            size={35}
                            stroke={1}
                            fill={"white"}
                            onClick={() =>
                                addMediaToPlaylist({ mediaId: album.id, action: "REPLACE" })
                            }
                        />
                    </Center>
                </Center>
            </Card.Section>

            {showDetails && (
                <Flex pt={7} justify="space-between">
                    <Stack spacing={0}>
                        <Text size="xs" weight="bold" sx={{ lineHeight: 1.25 }}>
                            {album.title}
                        </Text>
                        <Text size="xs" color="grey" sx={{ lineHeight: 1.25 }}>
                            {album.artist}
                        </Text>
                    </Stack>

                    <Box>
                        <Menu
                            classNames={menuStyles.classes}
                            position="top"
                            withinPortal={true}
                            withArrow
                        >
                            <Menu.Target>
                                <Box className={classes.pointerOnHover}>
                                    <IconDotsVertical size={15} />
                                </Box>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Label>Playlist</Menu.Label>
                                <Menu.Item
                                    onClick={() => {
                                        addMediaToPlaylist({ mediaId: album.id, action: "APPEND" });
                                    }}
                                >
                                    Append to end
                                </Menu.Item>
                                <Menu.Item
                                    onClick={() => {
                                        addMediaToPlaylist({
                                            mediaId: album.id,
                                            action: "REPLACE",
                                        });
                                    }}
                                >
                                    Replace
                                </Menu.Item>
                                <Menu.Item
                                    onClick={() => {
                                        addMediaToPlaylist({
                                            mediaId: album.id,
                                            action: "PLAY_NOW",
                                        });
                                    }}
                                >
                                    Insert and play now
                                </Menu.Item>
                                <Menu.Item
                                    onClick={() => {
                                        addMediaToPlaylist({
                                            mediaId: album.id,
                                            action: "PLAY_NEXT",
                                        });
                                    }}
                                >
                                    Insert and play next
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Box>
                </Flex>
            )}
        </Card>
    );
};

export default AlbumCard;
