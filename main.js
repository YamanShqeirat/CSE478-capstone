// ========== Data Loading and Cleaning ==========
d3.csv("Mental_Health_Care_in_the_Last_4_Weeks.csv").then(rawData => {
    const cleanedData = rawData.map(row => ({
        Indicator: cleanString(row["Indicator"]),
        Group: cleanString(row["Group"]),
        Subgroup: cleanString(row["Subgroup"]),
        TimePeriod: cleanString(row["Time Period"]),
        Value: parseNumber(row["Value"]),
        CI_Lower: parseNumber(row["Confidence Interval (Low Bound)"]),
        CI_Upper: parseNumber(row["Confidence Interval (High Bound)"]),
    })).filter(row =>
        row.Indicator &&
        row.Group &&
        row.Subgroup &&
        row.TimePeriod &&
        isFinite(row.Value)
    );

    initDashboard(cleanedData);
}).catch(error => {
    console.error("Error loading or cleaning data:", error);
});

// ========== Helper Functions ==========
function cleanString(str) {
    if (!str || typeof str !== "string") return null;
    return str.trim()
              .toLowerCase()
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
}

function parseNumber(value) {
    if (!value) return null;
    return parseFloat(value.replace(/[%,$]/g, "").trim());
}

// ========== Dashboard Setup ==========
function initDashboard(data) {
    populateFilters(data);
    renderCharts(data);

    d3.selectAll("#groupFilter, #timeFilter, #indicatorFilter")
        .on("change", () => renderCharts(data));
}

function populateFilters(data) {
    const groupOptions = Array.from(new Set(data.map(d => d.Group))).sort();
    const timeOptions = Array.from(new Set(data.map(d => d.TimePeriod))).sort();
    const indicatorOptions = Array.from(new Set(data.map(d => d.Indicator))).sort();

    function populate(selector, placeholder, options) {
        const select = d3.select(selector);
        select.html(`<option disabled selected>${placeholder}</option>`)
            .selectAll("option.option-item")
            .data(options)
            .join("option")
            .attr("class", "option-item")
            .attr("value", d => d)
            .text(d => d);
    }

    populate("#groupFilter", "Select a demographic group...", groupOptions);
    populate("#timeFilter", "Select a time period...", timeOptions);
    populate("#indicatorFilter", "Select a mental health indicator...", indicatorOptions);
}

function renderCharts(data) {
    const selectedGroup = d3.select("#groupFilter").property("value");
    const selectedTime = d3.select("#timeFilter").property("value");
    const selectedIndicator = d3.select("#indicatorFilter").property("value");

    if (!selectedGroup || !selectedTime || !selectedIndicator) return;

    const lineData = data.filter(d =>
        d.Group === selectedGroup && d.Indicator === selectedIndicator
    );

    const barData = data.filter(d =>
        d.TimePeriod === selectedTime && d.Indicator === selectedIndicator
    );

    drawLineChart(lineData);
    drawBarChart(barData);
}

// ========== Line Chart ==========
function drawLineChart(data) {
    const svg = d3.select("#lineChart");
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 30, bottom: 60, left: 70 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    if (data.length === 0) {
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", height / 2 + margin.top)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("No data available for this selection.");
        return;
    }

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(data.map(d => d.TimePeriod))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Value)]).nice()
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .style("font-size", "12px");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");

    // Axis Labels
    svg.append("text")
        .attr("x", margin.left + width / 2)
        .attr("y", height + margin.top + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Time Period");

    svg.append("text")
        .attr("transform", `rotate(-90)`)
        .attr("x", - (margin.top + height / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Value (%)");

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#007acc")
        .attr("stroke-width", 3)
        .attr("d", d3.line()
            .x(d => x(d.TimePeriod))
            .y(d => y(d.Value))
        );

    g.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.TimePeriod))
        .attr("cy", d => y(d.Value))
        .attr("r", 5)
        .attr("fill", "#00a8a8")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff9933");
            showTooltip(event, `Value: ${d.Value.toFixed(1)}%<br>CI: [${d.CI_Lower.toFixed(1)} - ${d.CI_Upper.toFixed(1)}]`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#00a8a8");
            hideTooltip();
        });
}

// ========== Bar Chart ==========
function drawBarChart(data) {
    const svg = d3.select("#barChart");
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 30, bottom: 130, left: 70 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    if (data.length === 0) {
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", height / 2 + margin.top)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("No data available for this selection.");
        return;
    }

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.Subgroup))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Value)]).nice()
        .range([height, 0]);

    const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    xAxis.selectAll("text")
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .style("font-size", "11px")
        .attr("dx", "-0.6em")
        .attr("dy", "0.15em")
        .each(function(d) {
            const label = d3.select(this);
            const text = label.text();
            label.text(text.length > 20 ? text.slice(0, 17) + "…" : text);
            label.append("title").text(text);
        });

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");

    svg.append("text")
        .attr("x", margin.left + width / 2)
        .attr("y", height + margin.top + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Subgroup");

    svg.append("text")
        .attr("transform", `rotate(-90)`)
        .attr("x", - (margin.top + height / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Value (%)");

    g.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.Subgroup))
        .attr("y", d => y(d.Value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.Value))
        .attr("fill", "#3454d1")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff9933");
            showTooltip(event, `Value: ${d.Value.toFixed(1)}%<br>CI: [${d.CI_Lower.toFixed(1)} - ${d.CI_Upper.toFixed(1)}]`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#3454d1");
            hideTooltip();
        });
}

// ========== Tooltip ==========
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

function showTooltip(event, content) {
    tooltip
        .html(`<div class="tooltip-content">${content}</div>`)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 30 + "px")
        .style("opacity", 1)
        .style("display", "block");
}

function hideTooltip() {
    tooltip.style("display", "none");
}
