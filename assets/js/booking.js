export function initializeBookingForms(apiClient, showToast, unwrapPayload) {
    document.querySelectorAll('[data-booking-slot-root]').forEach(function (root) {
        if (root.dataset.bookingBound === '1') {
            return;
        }

        root.dataset.bookingBound = '1';

        if (root.getAttribute('data-booking-mode') === 'rental') {
            bindRentalBooking(root, apiClient, showToast, unwrapPayload);

            return;
        }

        bindStandardBooking(root, apiClient, showToast, unwrapPayload);
    });
}

function bindStandardBooking(root, apiClient, showToast, unwrapPayload) {
    var dateInput = root.querySelector('[data-booking-date-input]');

    if (!dateInput) {
        return;
    }

    dateInput.addEventListener('change', function () {
        loadStandardBookingSlots(root, apiClient, showToast, unwrapPayload);
    });

    if (dateInput.value) {
        loadStandardBookingSlots(root, apiClient, showToast, unwrapPayload);
    }
}

function bindRentalBooking(root, apiClient, showToast, unwrapPayload) {
    var dateInput = root.querySelector('[data-booking-rental-date]');
    var slotSelect = root.querySelector('[data-booking-rental-slot-select]');

    root.querySelectorAll('[data-booking-renting-type]').forEach(function (input) {
        input.addEventListener('change', function () {
            toggleRentalMode(root);
        });
    });

    if (dateInput && slotSelect) {
        dateInput.addEventListener('change', function () {
            loadRentalBookingSlots(root, apiClient, showToast, unwrapPayload);
        });

        slotSelect.addEventListener('change', function () {
            populateRentalTimeSlots(root);
        });
    }

    toggleRentalMode(root);
}

function toggleRentalMode(root) {
    var selectedType = root.querySelector('[data-booking-renting-type]:checked');
    var dailyFields = root.querySelector('[data-booking-rental-daily-fields]');
    var hourlyFields = root.querySelector('[data-booking-rental-hourly-fields]');
    var isHourly = !selectedType || selectedType.value === 'hourly';

    if (dailyFields) {
        dailyFields.hidden = isHourly;
    }

    if (hourlyFields) {
        hourlyFields.hidden = !isHourly;
    }
}

function loadStandardBookingSlots(root, apiClient, showToast, unwrapPayload) {
    var url = root.getAttribute('data-booking-slots-url');
    var dateInput = root.querySelector('[data-booking-date-input]');
    var slotSelect = root.querySelector('[data-booking-slot-select]');

    if (!url || !dateInput || !slotSelect || !dateInput.value) {
        return;
    }

    setSelectLoading(slotSelect, root.getAttribute('data-loading-label'));

    apiClient.get(url, {
        date: dateInput.value,
    })
        .then(function (responseData) {
            var payload = unwrapPayload(responseData) || [];
            var slots = Array.isArray(payload) ? payload : [];

            populateSelect(slotSelect, slots.map(function (slot) {
                return {
                    value: slot.timestamp || slot.from_timestamp || slot.from || '',
                    label: [slot.from, slot.to].filter(Boolean).join(' - '),
                };
            }), root.getAttribute('data-empty-label'));
        })
        .catch(function () {
            populateSelect(slotSelect, [], root.getAttribute('data-empty-label'));
            showToast('error', root.getAttribute('data-error-label') || 'Unable to load booking slots.');
        });
}

function loadRentalBookingSlots(root, apiClient, showToast, unwrapPayload) {
    var url = root.getAttribute('data-booking-slots-url');
    var dateInput = root.querySelector('[data-booking-rental-date]');
    var slotSelect = root.querySelector('[data-booking-rental-slot-select]');

    if (!url || !dateInput || !slotSelect || !dateInput.value) {
        return;
    }

    setSelectLoading(slotSelect, root.getAttribute('data-loading-label'));

    apiClient.get(url, {
        date: dateInput.value,
    })
        .then(function (responseData) {
            var payload = unwrapPayload(responseData) || [];

            root._glRentalSlots = Array.isArray(payload) ? payload : [];

            populateSelect(slotSelect, root._glRentalSlots.map(function (slot, index) {
                return {
                    value: String(index),
                    label: slot.time || '',
                };
            }), root.getAttribute('data-empty-label'));

            populateRentalTimeSlots(root);
        })
        .catch(function () {
            root._glRentalSlots = [];
            populateSelect(slotSelect, [], root.getAttribute('data-empty-label'));
            populateRentalTimeSlots(root);
            showToast('error', root.getAttribute('data-error-label') || 'Unable to load booking slots.');
        });
}

function populateRentalTimeSlots(root) {
    var slotSelect = root.querySelector('[data-booking-rental-slot-select]');
    var fromSelect = root.querySelector('[data-booking-rental-from]');
    var toSelect = root.querySelector('[data-booking-rental-to]');
    var slots = root._glRentalSlots || [];
    var selectedSlot = slots[parseInt(slotSelect && slotSelect.value, 10)] || null;
    var timeSlots = selectedSlot && Array.isArray(selectedSlot.slots) ? selectedSlot.slots : [];

    populateSelect(fromSelect, timeSlots.map(function (slot) {
        return {
            value: slot.from_timestamp || '',
            label: slot.from || '',
        };
    }), root.getAttribute('data-select-time-label'));

    populateSelect(toSelect, timeSlots.map(function (slot) {
        return {
            value: slot.to_timestamp || '',
            label: slot.to || '',
        };
    }), root.getAttribute('data-select-time-label'));
}

function setSelectLoading(select, loadingLabel) {
    populateSelect(select, [], loadingLabel || 'Loading...');
}

function populateSelect(select, options, placeholder) {
    if (!select) {
        return;
    }

    select.innerHTML = '';

    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder || '';
    select.appendChild(defaultOption);

    if (!options.length) {
        return;
    }

    options.forEach(function (optionConfig) {
        var option = document.createElement('option');
        option.value = optionConfig.value;
        option.textContent = optionConfig.label;
        select.appendChild(option);
    });
}
