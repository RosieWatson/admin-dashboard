import { useEffect, useState } from 'react';
import { Control, useFormState } from 'react-hook-form';
import { useBlocker } from 'react-router-dom';
import { useTranslate } from '../i18n';

/**
 * Display a confirmation dialog if the form has unsaved changes.
 * - If the user confirms, the navigation continues and the changes are lost.
 * - If the user cancels, the navigation is cancelled and the changes are kept.
 */
export const useWarnWhenUnsavedChanges = (
    enable: boolean,
    formRootPathname?: string,
    control?: Control
) => {
    const translate = useTranslate();
    const { isSubmitSuccessful, dirtyFields } = useFormState(
        control ? { control } : undefined
    );
    const isDirty = Object.keys(dirtyFields).length > 0;
    const [shouldNotify, setShouldNotify] = useState(false);

    const shouldNotBlock = !enable || !isDirty || isSubmitSuccessful;

    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (shouldNotBlock) return false;

        // Also check if the new location is inside the form
        const initialLocation = formRootPathname || currentLocation.pathname;
        const newLocationIsInsideCurrentLocation = nextLocation.pathname.startsWith(
            initialLocation
        );
        const newLocationIsShowView = nextLocation.pathname.startsWith(
            `${initialLocation}/show`
        );
        const newLocationIsInsideForm =
            newLocationIsInsideCurrentLocation && !newLocationIsShowView;
        if (newLocationIsInsideForm) return false;

        return true;
    });

    useEffect(() => {
        if (blocker.state === 'blocked') {
            setShouldNotify(true);
        }
    }, [blocker.state]);

    useEffect(() => {
        if (shouldNotify) {
            const shouldProceed = window.confirm(
                translate('ra.message.unsaved_changes')
            );
            if (shouldProceed) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        }
        setShouldNotify(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldNotify]);

    // This effect handles document navigation, e.g. closing the tab
    useEffect(() => {
        const beforeunload = (e: BeforeUnloadEvent) => {
            // Invoking event.preventDefault() will trigger a warning dialog when the user closes or navigates the tab
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event#examples
            e.preventDefault();
            // Included for legacy support, e.g. Chrome/Edge < 119
            e.returnValue = true;
        };

        if (!shouldNotBlock) {
            window.addEventListener('beforeunload', beforeunload);
        }

        return () => {
            if (!shouldNotBlock) {
                window.removeEventListener('beforeunload', beforeunload);
            }
        };
    }, [shouldNotBlock]);
};
