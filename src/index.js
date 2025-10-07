(function () {
  "use strict";

  
  /**
   * Parses a string containing time intervals and returns an array of interval objects with start and stop times.
   *
   * The intervals should be in the format "(HH:MM - HH:MM)", and multiple intervals can be present in the string.
   * If the stop time is before the start time, it is assumed the interval passes midnight.
   *
   * @param {string} intervalsString - The string containing time intervals to parse.
   * @param {string} activity - The activity associated with each interval.
   * @returns {Array<{startTime: Date, stopTime: Date, activity: string}>} Array of interval objects with startTime, stopTime, and activity.
   */
  function getIntervalsFromString(intervalsString, activity) {
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

      intervals.push({ startTime, stopTime, activity });
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
   * Extracts and returns the trimmed text content of the first <strong> element
   * inside the first <td> of a given table row.
   *
   * @param {HTMLTableRowElement} row - The table row element to extract the day string from.
   * @returns {string} The trimmed text content of the <strong> element, or an empty string if not found.
   */
  function getTableRowDayString(row) {
    // Get the first <td> in the row
    const firstTd = row.querySelector("td");
    if (!firstTd) return "";
    // Get the first <strong> inside the first <td>
    const strong = firstTd.querySelector("strong");
    return strong ? strong.textContent.trim() : "";
  }


  /**
   * Generates a unique semi-transparent HSL color for each activity in the input array.
   * Colors are evenly distributed across the hue spectrum.
   *
   * @param {string[]} activities - Array of activity names to assign colors to.
   * @returns {Object.<string, string>} An object mapping each activity name to its unique HSLA color string.
   */
  function generateUniqueColorForActivities(activities) {
    const colors = {};
    const hueStep = Math.floor(360 / activities.length);
    activities.forEach((activity, index) => {
      const hue = index * hueStep;
      colors[activity] = `hsla(${hue}, 70%, 50%, 0.5)`; // HSL color with fixed saturation and lightness
    });
    return colors;
  }

  
  /**
   * Groups table rows from a given tbody element into logical groups based on row IDs,
   * extracts interval data, assigns unique colors to activities, and calculates summary statistics
   * for each group (total time, start/stop times, gap/overlap times).
   *
   * @param {HTMLTableSectionElement} tbody - The table body element containing rows to group.
   * @returns {Array<Object>} Array of group objects, each containing:
   *   - headerRowElementId {string}: The ID of the header row for the group.
   *   - dayString {string}: The day string extracted from the header row.
   *   - intervals {Array<Object>}: Array of interval objects with activity, startTime, stopTime, and color.
   *   - totalTime {number}: Total time for all intervals in the group (milliseconds).
   *   - startTime {number}: Earliest start time among intervals (milliseconds since epoch).
   *   - stopTime {number}: Latest stop time among intervals (milliseconds since epoch).
   *   - totalGapTimeMs {number}: Total gap time between intervals (milliseconds).
   *   - totalOverlapTimeMs {number}: Total overlap time between intervals (milliseconds).
   */
  function groupTableRows(tbody) {
    const groups = [];
    const activities = new Set();
    let currentGroup = null;

    // Get all tr elements inside the tbody
    const rows = tbody.querySelectorAll("tr");

    rows.forEach((row) => {
      if (row.id) {
        // If we encounter a row with an id, start a new group
        currentGroup = {
          headerRowElementId: row.id,
          dayString: getTableRowDayString(row),
          intervals: [],
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // Otherwise, this row belongs to the current group
        const interval = row.querySelector(
          ".timeReportStopwatchIntervals strong"
        );
        const activity = row?.cells[1]?.textContent?.trim().replace(/\s+/g, " ");
        if (activity) {
          activities.add(activity);
        }
        if (interval) {
          currentGroup.intervals.push(
            ...getIntervalsFromString(interval.textContent.trim(), activity)
          );
        }
      }
    });

    const activityColors = generateUniqueColorForActivities(Array.from(activities));

    groups.forEach((group) => {
      // Sort intervals by start time
      group.intervals.sort((a, b) => a.startTime - b.startTime);

      // Assign colors to intervals based on activity
      group.intervals.forEach((interval) => {
        interval.color = activityColors[interval.activity] || "hsla(0, 0%, 0%, 0.5)"; // Default to semi-transparent black if no color found
      });

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
   * @param {number} threshold - The threshold value in milliseconds to compare against.
   * @param {boolean} warningIfExceeded - If true, warns when time exceeds threshold; if false, warns when time is below threshold.
   * @returns {HTMLSpanElement} The styled span element representing the time and status.
   */
  function renderTimeElement(time, threshold, warningIfExceeded) {
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

    timeElement.innerHTML = `${warningIcon} <span style="font-weight: 500;">${hours}t ${minutes}m</span>`;

    return timeElement;
  }

  /**
   * Renders a time element for the total time, applying a threshold of 7.5 hours.
   *
   * @param {number} totalTime - The total time in milliseconds.
   * @returns {HTMLElement} The rendered time element.
   */
  function renderTotalTimeElement(totalTime) {
    const threshold = 7.5 * 60 * 60 * 1000; // 7.5 hours
    return renderTimeElement(totalTime, threshold, false);
  }

  /**
   * Renders a time element for a given gap time, applying a threshold of 30 minutes.
   *
   * @param {number} gapTime - The gap time in milliseconds to be rendered.
   * @returns {HTMLElement} The rendered time element.
   */
  function renderGapTimeElement(gapTime) {
    const threshold = 30 * 60 * 1000; // 30 minutes
    return renderTimeElement(gapTime, threshold, true);
  }

  /**
   * Renders a time element for the given overlap time.
   *
   * @param {number} overlapTime - The time value representing the overlap.
   * @returns {HTMLElement} The rendered time element.
   */
  function renderOverlapTimeElement(overlapTime) {
    const threshold = 0; // No threshold for overlap
    return renderTimeElement(overlapTime, threshold, true);
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
   * @param {string} group.intervals[].color - The color to fill the interval rectangle.
   * @param {number} maxGroupTotalTime - The maximum total time for the group, used for scaling.
   * @returns {SVGSVGElement} The generated SVG element representing the timeline.
   */
  function renderSvgTimeline(group, maxGroupTotalTime) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "30");
    svg.setAttribute("overflow", "visible");

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
      rect.setAttribute("fill", interval.color);
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
    const contentContainerElement = document.getElementById("wrapperDiv");
    const groupInfoElement = document.createElement("div");
    groupInfoElement.style.border = "1px solid var(--atl-color-grey-20)";
    groupInfoElement.style.borderRadius = "4px";
    groupInfoElement.style.backgroundColor = "#FFF";
    groupInfoElement.style.color = "var(--atl-color-grey-100)";
    groupInfoElement.style.marginBottom = "16px";

    const groupInfoTitleElement = document.createElement("div");
    groupInfoTitleElement.style.display = "inline-block";
    groupInfoTitleElement.style.margin = "6px 24px 6px 0";
    groupInfoTitleElement.style.padding = "10px 24px";
    groupInfoTitleElement.style.fontSize = "20px";
    groupInfoTitleElement.style.lineHeight = "24px";
    groupInfoTitleElement.style.fontWeight = "400";
    groupInfoTitleElement.style.color = "var(--atl-color-grey-100)";
    groupInfoTitleElement.style.fontFamily = "Rubik,Helvetica,Arial,'sans-serif'";
    groupInfoTitleElement.textContent = "Gaps N' Laps";
    groupInfoElement.appendChild(groupInfoTitleElement);

    const groupInfoTableHeader = document.createElement("div");
    const tableHeaderCellStyle = "font-size: 13px; line-height: 18px; font-weight: 500; font-family: Rubik, Helvetica, Arial, sans-serif; color: #666; background: var(--tlx-theme-pastel-color); padding-top: 16px; padding-bottom: 8px;";
    groupInfoTableHeader.style.display = "flex";
    groupInfoTableHeader.style.borderBottom = "1px solid #ddd";
    groupInfoTableHeader.innerHTML = `
        <div style="${tableHeaderCellStyle} flex: 1; padding-left: 24px; padding-right: 8px;">Dag</div>
        <div style="${tableHeaderCellStyle} flex: 1; padding-left: 8px; padding-right: 8px;">Overlapp</div>
        <div style="${tableHeaderCellStyle} flex: 1; padding-left: 8px; padding-right: 8px;">Pause</div>
        <div style="${tableHeaderCellStyle} flex: 1; padding-left: 8px; padding-right: 8px;">Tid</div>
        <div style="${tableHeaderCellStyle} flex: 3; padding-left: 8px; padding-right: 24px;">Tidslinje</div>
    `;
    groupInfoElement.appendChild(groupInfoTableHeader);

    const groupInfoTableBody = document.createElement("div");

    groupedRows.forEach((group) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.padding = "8px 0";
      row.style.borderBottom = "1px solid #ddd";
      row.style.padding = "10px 24px";


      // Date cell
      const dateCell = document.createElement("div");
      dateCell.style.flex = "1";
      dateCell.style.fontWeight = "500";
      dateCell.style.color = "#666";
      dateCell.textContent = group.dayString || "Ukjent dag";
      row.appendChild(dateCell);

      // Overlap time cell
      const overlapCell = document.createElement("div");
      overlapCell.style.flex = "1";
      overlapCell.appendChild(renderOverlapTimeElement(group.totalOverlapTimeMs));
      row.appendChild(overlapCell);

      // Gap time cell
      const gapCell = document.createElement("div");
      gapCell.style.flex = "1";
      gapCell.appendChild(renderGapTimeElement(group.totalGapTimeMs));
      row.appendChild(gapCell);

      // Total time cell
      const totalTimeCell = document.createElement("div");
      totalTimeCell.style.flex = "1";
      totalTimeCell.appendChild(renderTotalTimeElement(group.totalTime));
      row.appendChild(totalTimeCell);

      // Timeline cell
      const timelineCell = document.createElement("div");
      timelineCell.style.flex = "3"; // Make timeline take more space
      timelineCell.appendChild(renderSvgTimeline(group, maxGroupTotalTime));
      row.appendChild(timelineCell);

      groupInfoTableBody.appendChild(row);
      
    });

    groupInfoElement.appendChild(groupInfoTableBody);

    contentContainerElement.appendChild(groupInfoElement);
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
