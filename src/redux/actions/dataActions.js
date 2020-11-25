// Types
import {
  SET_VIEWPORT,
  SET_SELECTED_PLACE,
  SET_PLACES,
  SET_CLICK,
  SET_COORDS,
  RESET_COORDS,
  SET_MAP_STYLE,
  SET_ERROR,
  CLEAR_ERROR,
  START_LOADING,
  STOP_LOADING,
} from "../types";
// Firebase
import firebase from "firebase/app";
import { storage, db } from "../../utilities/firebase";
import { v4 as uuid } from "uuid";

export const setViewport = (viewport) => (dispatch) => {
  dispatch({
    type: SET_VIEWPORT,
    payload: viewport,
  });
};

export const setCurrentUserPosition = (viewport) => (dispatch) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const updatedViewport = {
        ...viewport,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        zoom: 12,
      };
      dispatch(setViewport(updatedViewport));
    });
  }
};

export const setMapStyle = (mapStyleURL) => (dispatch) => {
  dispatch({
    type: SET_MAP_STYLE,
    payload: mapStyleURL,
  });
};

export const mapClick = (coords) => (dispatch) => {
  dispatch(setClick(true));
  dispatch(setCoords(coords));
};

export const mapUnClick = () => (dispatch) => {
  dispatch(setClick(false));
  dispatch(resetCoords());
};

export const setClick = (click) => (dispatch) => {
  dispatch({
    type: SET_CLICK,
    payload: click,
  });
};

export const setCoords = (coords) => (dispatch) => {
  dispatch({
    type: SET_COORDS,
    payload: coords,
  });
};

export const resetCoords = () => (dispatch) => {
  dispatch({ type: RESET_COORDS });
};

export const clearError = () => (dispatch) => {
  dispatch({ type: CLEAR_ERROR });
};

const isLocationUnique = async (location) => {
  const placesRef = db.collection("places");
  const foundPlaces = [];
  const query = placesRef
    .where("location", "==", location)
    .where("public", "==", true);
  const docs = await query.get();
  docs.forEach((doc) => {
    foundPlaces.push(doc.data());
  });
  if (foundPlaces.length > 0) {
    return false;
  } else {
    return true;
  }
};

export const addPlace = (
  longitude,
  latitude,
  location,
  description,
  markerColor,
  photosFiles,
  publicStatus
) => async (dispatch) => {
  dispatch({ type: START_LOADING });
  dispatch({ type: CLEAR_ERROR });

  try {
    if (location.trim() === "") return;

    if (publicStatus === true) {
      if ((await isLocationUnique(location)) === false) {
        dispatch({
          type: SET_ERROR,
          payload: "Place with this location arleady exist",
        });
        return dispatch({ type: STOP_LOADING });
      }
    }

    const photosUrls = photosFiles.map(async (photo) => {
      const storageRef = storage.ref();
      const fileRef = storageRef.child(uuid());
      await fileRef.put(photo);
      const fileUrl = await fileRef.getDownloadURL();
      return fileUrl;
    });
    const photoUrlsPromisesResolved = await Promise.all(photosUrls);

    const placesRef = db.collection("places");

    const createdPlace = {
      longitude,
      latitude,
      location,
      markerColor,
      photos: photoUrlsPromisesResolved,
      public: publicStatus,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (description.trim() !== "") {
      createdPlace.description = description;
    }
    await placesRef.add(createdPlace);
  } catch (err) {
    console.log(err);
    dispatch({
      type: SET_ERROR,
      payload: "Somethink went wrong. Please try again",
    });
  }

  dispatch({ type: STOP_LOADING });
};

export const getPublicPlaces = () => async (dispatch) => {
  dispatch({ type: START_LOADING });

  const publicPlaces = [];
  const placesRef = db.collection("places");
  const query = placesRef.where("public", "==", true);
  const docs = await query.get();
  docs.forEach((doc) => {
    publicPlaces.push(doc.data());
  });
  dispatch({
    type: SET_PLACES,
    payload: publicPlaces,
  });

  dispatch({ type: STOP_LOADING });
};
