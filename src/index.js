(function () {
  "use strict";

  /**
   * Parses a string containing time intervals in the format "(HH:MM - HH:MM)"
   * and returns an array of objects with start and stop Date instances for each interval.
   * If the stop time is before the start time, the stop time is assumed to be on the next day.
   *
   * @param {string} intervalsString - The string containing time intervals to parse.
   * @returns {Array<{startTime: Date, stopTime: Date}>} Array of interval objects with startTime and stopTime.
   */
  function getIntervalsFromString(intervalsString) {
    // Trim unnecessary spaces
    const text = intervalsString.trim();

    // Use regex to match all time intervals
    const regex = /\((\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\)/g;

    let matches;
    const intervals = [];

    // Get today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    // Loop through all matches
    while ((matches = regex.exec(text)) !== null) {
      const [, startHour, startMinute, stopHour, stopMinute] = matches;

      // Create start and stop Date objects
      const startTime = new Date(year, month, day, startHour, startMinute);
      let stopTime = new Date(year, month, day, stopHour, stopMinute);

      // If stop time is before start time, it means the interval passes midnight → add 1 day
      if (stopTime < startTime) {
        stopTime.setDate(stopTime.getDate() + 1);
      }

      intervals.push({ startTime, stopTime });
    }
    return intervals;
  }

  /**
   * Returns the start time of the first interval in the given group.
   *
   * @param {Object} group - The group object containing intervals.
   * @param {Array} group.intervals - Array of interval objects.
   * @returns {(number|null)} The start time of the first interval, or null if there are no intervals.
   */
  function getGroupStartTime(group) {
    if (group.intervals.length > 0) {
      return group.intervals[0].startTime;
    } else {
      return null;
    }
  }

  /**
   * Returns the stop time of the last interval in the given group.
   *
   * @param {Object} group - The group object containing intervals.
   * @param {Array} group.intervals - An array of interval objects.
   * @returns {(any|null)} The stop time of the last interval, or null if there are no intervals.
   */
  function getGroupStopTime(group) {
    if (group.intervals.length > 0) {
      return group.intervals[group.intervals.length - 1].stopTime;
    } else {
      return null;
    }
  }

  /**
   * Calculates the total time for all intervals in a group.
   *
   * @param {Object} group - The group object containing intervals.
   * @param {Array<Object>} group.intervals - Array of interval objects.
   * @param {number} group.intervals[].startTime - The start time of the interval (in milliseconds).
   * @param {number} group.intervals[].stopTime - The stop time of the interval (in milliseconds).
   * @returns {number} The total time of all intervals in the group (in milliseconds).
   */
  function getGroupTotalTime(group) {
    return group.intervals.reduce((total, interval) => {
      return total + (interval.stopTime - interval.startTime);
    }, 0);
  }

  /**
   * Calculates the total gap time in milliseconds between consecutive intervals in a group.
   * A gap is counted only if the start time of the current interval is after the stop time of the previous interval.
   *
   * @param {Object} group - The group object containing intervals.
   * @param {Array<Object>} group.intervals - Array of interval objects with `startTime` and `stopTime` properties (in milliseconds).
   * @returns {number} The total gap time in milliseconds between intervals.
   */
  function getGroupTotalGapTime(group) {
    let totalGapTimeMs = 0;
    for (let i = 1; i < group.intervals.length; i++) {
      const gap =
        group.intervals[i].startTime - group.intervals[i - 1].stopTime;
      if (gap > 0) {
        totalGapTimeMs += gap;
      }
    }
    return totalGapTimeMs;
  }

  /**
   * Calculates the total overlap time (in milliseconds) between consecutive intervals in a group.
   *
   * @param {Object} group - The group containing intervals.
   * @param {Array<Object>} group.intervals - Array of interval objects, each with `startTime` and `stopTime` properties (in milliseconds).
   * @returns {number} The total overlap time in milliseconds between consecutive intervals.
   */
  function getGroupTotalOverlapTime(group) {
    let totalOverlapTimeMs = 0;
    for (let i = 1; i < group.intervals.length; i++) {
      const overlap =
        group.intervals[i - 1].stopTime - group.intervals[i].startTime;
      if (overlap > 0) {
        totalOverlapTimeMs += overlap;
      }
    }
    return totalOverlapTimeMs;
  }


    /**
   * Calculates the maximum total time among all groups.
   * The total time for each group is the sum of `totalTime` and `totalGapTimeMs`.
   *
   * @param {Array<{totalTime: number, totalGapTimeMs: number}>} groups - Array of group objects.
   * @returns {number} The maximum total time found among the groups.
   */
  function getMaxGroupTotalTime(groups) {
    return Math.max(...groups.map((group) => group.totalTime + group.totalGapTimeMs));
  }

  

  /**
   * Groups table rows within a given <tbody> element based on header rows (rows with an id).
   * Each group contains intervals extracted from rows following the header row.
   * The function also calculates and attaches summary statistics for each group, such as total time,
   * start time, stop time, total gap time, and total overlap time.
   *
   * @param {HTMLTableSectionElement} tbody - The <tbody> element containing the table rows to group.
   * @returns {Array<Object>} Array of group objects, each with headerRowElementId, intervals, totalTime,
   *                          startTime, stopTime, totalGapTimeMs, and totalOverlapTimeMs properties.
   */
  function groupTableRows(tbody) {
    const groups = [];
    let currentGroup = null;

    // Get all tr elements inside the tbody
    const rows = tbody.querySelectorAll("tr");

    rows.forEach((row) => {
      if (row.id) {
        // If we encounter a row with an id, start a new group
        currentGroup = {
          headerRowElementId: row.id,
          intervals: [],
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // Otherwise, this row belongs to the current group
        const interval = row.querySelector(
          ".timeReportStopwatchIntervals strong"
        );
        if (interval) {
          currentGroup.intervals.push(
            ...getIntervalsFromString(interval.textContent.trim())
          );
        }
      }
    });

    groups.forEach((group) => {
      // Sort intervals by start time
      group.intervals.sort((a, b) => a.startTime - b.startTime);

      // Calculate total time, start time, stop time, total gap time, and total overlap time
      group.totalTime = getGroupTotalTime(group);
      group.startTime = getGroupStartTime(group);
      group.stopTime = getGroupStopTime(group);
      group.totalGapTimeMs = getGroupTotalGapTime(group);
      group.totalOverlapTimeMs = getGroupTotalOverlapTime(group);
    });

    return groups;
  }

  /**
   * Resets the `colSpan` property of all <td> elements in the given header row to 1.
   *
   * @param {HTMLTableRowElement} headerRow - The table row element containing <td> cells to adjust.
   */
  function adjustOriginalHeaderRowTd(headerRow) {
    if (headerRow) {
      const originalCells = headerRow.querySelectorAll("td");
      originalCells.forEach((cell) => {
        cell.colSpan = 1;
      });
    }
  }

  /**
   * Converts milliseconds to whole hours.
   *
   * @param {number} ms - The time duration in milliseconds.
   * @returns {number} The number of whole hours contained in the given milliseconds.
   */
  function getHoursFromMilliseconds(ms) {
    return Math.floor(ms / (1000 * 60 * 60));
  }

  /**
   * Returns the number of minutes (0-59) from a given duration in milliseconds,
   * ignoring full hours.
   *
   * @param {number} ms - The duration in milliseconds.
   * @returns {number} The number of minutes extracted from the milliseconds.
   */
  function getMinutesFromMilliseconds(ms) {
    return Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  }

  /**
   * Creates a styled time element displaying hours and minutes, with a warning or success icon
   * based on whether the time is outside a specified threshold.
   *
   * @param {number} time - The time value in milliseconds.
   * @param {string} label - The label to display before the time.
   * @param {number} threshold - The threshold value in milliseconds to compare against.
   * @param {boolean} warningIfExceeded - If true, warns when time exceeds threshold; if false, warns when time is below threshold.
   * @returns {HTMLSpanElement} The styled span element representing the time and status.
   */
  function renderTimeElement(time, label, threshold, warningIfExceeded) {
    const timeElement = document.createElement("span");

    const timeIsOutsideThreshold = warningIfExceeded
      ? time > threshold
      : time < threshold;

    // Colors & background for better visuals
    const color = timeIsOutsideThreshold ? "#e63946" : "#2a9d60"; // Red or Green

    // Styling for container
    timeElement.style.display = "inline-flex";
    timeElement.style.alignItems = "center";
    timeElement.style.marginRight = "14px";
    timeElement.style.fontSize = "14px";
    timeElement.style.color = color;
    timeElement.style.whiteSpace = "break-spaces";

    // Get hours and minutes
    const hours = getHoursFromMilliseconds(time);
    const minutes = getMinutesFromMilliseconds(time);

    // Add warning icon if totalTime is outside threshold
    const warningIcon = timeIsOutsideThreshold ? "⚠️ " : "✅ ";

    timeElement.innerHTML = `${warningIcon}${label}: <span style="font-weight: 500;">${hours}t ${minutes}m</span>`;

    return timeElement;
  }

  /**
   * Renders a time element displaying the total time.
   *
   * @param {number} totalTime - The total time in milliseconds.
   * @returns {HTMLElement} The rendered time element.
   */
  function renderTotalTimeElement(totalTime) {
    const threshold = 7.5 * 60 * 60 * 1000; // 7.5 hours
    return renderTimeElement(totalTime, "Tid", threshold, false);
  }

  /**
   * Renders a time element for a gap period, labeling it as "Pause".
   * Applies a threshold of 30 minutes to determine formatting.
   *
   * @param {number} gapTime - The duration of the gap in milliseconds.
   * @returns {HTMLElement} The rendered time element.
   */
  function renderGapTimeElement(gapTime) {
    const threshold = 30 * 60 * 1000; // 30 minutes
    return renderTimeElement(gapTime, "Pause", threshold, true);
  }

  /**
   * Renders a time element specifically for overlap time.
   *
   * @param {number} overlapTime - The amount of overlap time to render.
   * @returns {HTMLElement} The rendered time element for overlap.
   */
  function renderOverlapTimeElement(overlapTime) {
    const threshold = 0; // No threshold for overlap
    return renderTimeElement(overlapTime, "Overlapp", threshold, true);
  }

  /**
   * Renders an SVG timeline for a given group of intervals.
   *
   * Each interval is represented as a rectangle positioned and sized according to its start and stop times,
   * relative to the group's start time and the maximum total time of the group.
   *
   * @param {Object} group - The group containing intervals to render.
   * @param {number} group.startTime - The start time of the group.
   * @param {Array<Object>} group.intervals - Array of interval objects.
   * @param {number} group.intervals[].startTime - The start time of the interval.
   * @param {number} group.intervals[].stopTime - The stop time of the interval.
   * @param {number} maxGroupTotalTime - The maximum total time for the group, used for scaling.
   * @returns {SVGSVGElement} The generated SVG element representing the timeline.
   */
  function renderSvgTimeline(group, maxGroupTotalTime) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "30");

    group.intervals.forEach((interval) => {
      const rect = document.createElementNS(svgNS, "rect");
      const x =
        ((interval.startTime - group.startTime) / maxGroupTotalTime) * 100;
      const width =
        ((interval.stopTime - interval.startTime) / maxGroupTotalTime) * 100;

      rect.setAttribute("x", `${x}%`);
      rect.setAttribute("y", "0");
      rect.setAttribute("rx", "5"); // Rounded corners
      rect.setAttribute("ry", "5"); // Rounded corners
      rect.setAttribute("width", `${width}%`);
      rect.setAttribute("height", "30");
      rect.setAttribute("fill", "rgba(0, 90, 214, 0.5)"); // Semi-transparent blue
      rect.setAttribute("stroke", "#757c8a");
      rect.setAttribute("stroke-width", "1");

      svg.appendChild(rect);
    });
    return svg;
  }

  /**
   * Renders group information rows in the table, including total time, gap time, overlap time,
   * and a visual timeline for each group. Modifies the DOM by adding cells and rows to display
   * these details for each group in the provided array.
   *
   * @param {Array<Object>} groupedRows - An array of group objects, each containing information
   *   about the group's header row element ID, total time, total gap time in milliseconds,
   *   total overlap time in milliseconds, and other relevant properties.
   */
  function renderGroupInfo(groupedRows) {
    const maxGroupTotalTime = getMaxGroupTotalTime(groupedRows);
    groupedRows.forEach((group) => {
      const headerRow = document.getElementById(group.headerRowElementId);
      if (headerRow) {
        adjustOriginalHeaderRowTd(headerRow);
        // Create a new cell for total time
        const totalTimeCell = document.createElement("td");
        totalTimeCell.colSpan = 3; // Span across multiple columns for better visibility
        totalTimeCell.style.textAlign = "right"; // Align text to the right

        // Format total time in hours and minutes
        const totalTimeElement = renderTotalTimeElement(group.totalTime);
        const gapTimeElement = renderGapTimeElement(group.totalGapTimeMs);
        const overlapTimeElement = renderOverlapTimeElement(
          group.totalOverlapTimeMs
        );

        totalTimeCell.appendChild(overlapTimeElement);
        totalTimeCell.appendChild(gapTimeElement);
        totalTimeCell.appendChild(totalTimeElement);

        // Insert the new cell after the last cell in the header row
        headerRow.appendChild(totalTimeCell);

        // Create row below for timeline
        const timelineRow = document.createElement("tr");
        const timelineCell = document.createElement("td");
        timelineCell.colSpan = 4; // Span across all columns
        timelineCell.style.padding = "4px 24px"; // Add some padding for better appearance

        const timelineSvg = renderSvgTimeline(group, maxGroupTotalTime);
        timelineCell.appendChild(timelineSvg);
        timelineRow.appendChild(timelineCell);

        // Insert the timeline row after the header row
        headerRow.insertAdjacentElement("afterend", timelineRow);
      }
    });
  }

  /**
   * Observes DOM mutations and triggers a callback when the element with ID "timeReportTable" is added to the DOM.
   * Marks the element as "seen" using a custom data attribute to prevent duplicate triggers.
   * Removes the "seen" flag if the element is removed from the DOM, allowing retriggering when it reappears.
   *
   * @param {MutationRecord[]} mutationsList - List of mutations observed in the DOM.
   */
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      // Check if element exists in the DOM right now
      const element = document.getElementById("timeReportTable");

      if (element && !element.dataset._seen) {
        element.dataset._seen = "true"; // Mark as seen
        onTableLoaded(element);
      }

      // If element disappears, reset flag so we can retrigger later
      if (!element) {
        const oldElement = document.querySelector('[data-_seen="true"]');
        if (oldElement) {
          oldElement.removeAttribute("data-_seen");
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  /**
   * Handles the event when the time report table is loaded.
   * Groups the table rows and renders group information.
   *
   * @param {HTMLTableElement} timeReportTable - The table element containing the time report data.
   */
  function onTableLoaded(timeReportTable) {
    const tbody = timeReportTable.querySelector("tbody");
    const groupedRows = groupTableRows(tbody);
    renderGroupInfo(groupedRows);
  }
})();
