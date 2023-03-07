import React, { useEffect, useMemo, useReducer, useState } from "react";

import { Album, Track } from "../types";
import { useAppDispatch } from "../hooks";
import { setIsComputingInBackground } from "../store/internalSlice";
import { useGetAlbumsQuery } from "../services/vibinAlbums";
import { useGetTracksQuery } from "../services/vibinTracks";

// ================================================================================================
//
// This hook exists as an attempt to improve performance. The goal is to provide information about
// grouped media items (Artists, Albums, Tracks) quickly enough to enable a somewhat responsive UI.
//
// The approach taken here is to take the entire/flat list of Albums, Tracks, etc, and group them
// by some sort of index (Artist Name, Album Id, etc). The initial flat lists are not expected to
// change much, so the reduces performed here are unlikely to be called more than once per session.
//
// There are other ways to retrieve this information which might otherwise be more appropriate. For
// example, an artist's tracks could be retrieved (in a component that wants it) like this instead:
//
// const { artistTracks } = useGetTracksQuery(undefined, {
//     selectFromResult: ({ data }) => ({
//         artistTracks: data?.filter((track) => track.artist === "Artist Name")
//     }),
// });
//
// TODO: Examine the architecture of the app through a performance-focused lens, to see if there's
//  more elegant ways to approach UI responsiveness.
//
// ================================================================================================

interface LocalState {
    computing: string[];
}

interface LocalAction {
    type: "add_compute_label" | "remove_compute_label";
    payload: string;
}

const localReducer = (state: LocalState, action: LocalAction): LocalState => {
    // console.log("STATE", state);
    if (action.type === "add_compute_label") {
        return {
            ...state,
            computing: [...state.computing, action.payload],
        };
    } else if (action.type === "remove_compute_label") {
        return {
            ...state,
            computing: state.computing.filter((label) => label !== action.payload),
        };
    } else {
        // This could throw an unknown action type error, but for now we just ignore.
        return state;
    }
};

export const useMediaGroupings = () => {
    const [state, localDispatch] = useReducer(localReducer, { computing: [] });
    const dispatch = useAppDispatch();
    const { data: allAlbums, error: albumsError, isSuccess: albumsIsSuccess } = useGetAlbumsQuery();
    const { data: allTracks, error: tracksError, isSuccess: tracksIsSuccess } = useGetTracksQuery();
    const [albumsByArtistName, setAlbumsByArtistName] = useState<Record<string, Album[]>>({});
    const [tracksByAlbumId, setTracksByAlbumId] = useState<Record<string, Track[]>>({});
    const [tracksByArtistName, setTracksByArtistName] = useState<Record<string, Track[]>>({});
    const mediaGrouperWorker: Worker = useMemo(
        () => new Worker(new URL("../workers/mediaGrouperWorker.ts", import.meta.url)),
        []
    );

    mediaGrouperWorker.onmessage = (e) => {
        const { type, result } = e.data;

        type === "allAlbumsByArtistName" && setAlbumsByArtistName(result);
        type === "allTracksByArtistName" && setTracksByArtistName(result);
        type === "allTracksByAlbumId" && setTracksByAlbumId(result);

        localDispatch({ type: "remove_compute_label", payload: e.data.type });
    }

    /**
     *
     */
    useEffect(() => {
        dispatch(setIsComputingInBackground(state.computing.length > 0));
    }, [state, dispatch]);

    /**
     *
     */
    useEffect(() => {
        if (!allAlbums) {
            return;
        }

        const computeLabel = "allAlbumsByArtistName";
        localDispatch({ type: "add_compute_label", payload: computeLabel });
        mediaGrouperWorker.postMessage({ type: computeLabel, payload: allAlbums });
    }, [allAlbums, mediaGrouperWorker]);

    /**
     *
     */
    useEffect(() => {
        if (!allTracks) {
            return;
        }

        let computeLabel = "allTracksByArtistName";
        localDispatch({ type: "add_compute_label", payload: computeLabel });
        mediaGrouperWorker.postMessage({ type: computeLabel, payload: allTracks });

        computeLabel = "allTracksByAlbumId";
        localDispatch({ type: "add_compute_label", payload: computeLabel });
        mediaGrouperWorker.postMessage({ type: computeLabel, payload: allTracks });
    }, [allTracks, mediaGrouperWorker]);

    // --------------------------------------------------------------------------------------------

    // TODO: Investigate changing from "ByName" to "ById".

    return {
        allAlbumsByArtistName: (artist: string) => albumsByArtistName[artist] || [],
        allTracksByAlbumId: (album: string) => tracksByAlbumId[album] || [],
        allTracksByArtistName: (artist: string) => tracksByArtistName[artist] || [],
        isComputing: state.computing.length > 0,
    };
};