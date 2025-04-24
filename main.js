// ========== Data Loading and Cleaning ==========

d3.csv("Mental_Health_Care_in_the_Last_4_Weeks.csv").then(rawData => {
    const cleanedData = rawData
        .map(row => ({
            Indicator: cleanString(row["Indicator"]),
            Group: cleanString(row["Group"]),
            Subgroup: cleanString(row["Subgroup"]),
            TimePeriod: cleanString(row["Time Period"]),
            Value: parseNumber(row["Value"]),
            CI_Lower: parseNumber(row["Confidence Interval (Low Bound)"]),
            CI_Upper: parseNumber(row["Confidence Interval (High Bound)"]),
        }))
        .filter(row =>
            row.Indicator &&
            row.Group &&
            row.Subgroup &&
            row.TimePeriod &&
            isFinite(row.Value)
        );

    console.log("Cleaned Data Sample:", cleanedData.slice(0, 5));
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

    d3.select("#groupFilter").on("change", () => renderCharts(data));
    d3.select("#timeFilter").on("change", () => renderCharts(data));
    d3.select("#indicatorFilter").on("change", () => renderCharts(data));
}

function populateFilters(data) {
    const groupOptions = Array.from(new Set(data.map(d => d.Group))).sort();
    const timeOptions = Array.from(new Set(data.map(d => d.TimePeriod))).sort();
    const indicatorOptions = Array.from(new Set(data.map(d => d.Indicator))).sort();

    d3.select("#groupFilter")
        .selectAll("option")
        .data(groupOptions)
        .join("option")
        .text(d => d)
        .attr("value", d => d);

    d3.select("#timeFilter")
        .selectAll("option")
        .data(timeOptions)
        .join("option")
        .text(d => d)
        .attr("value", d => d);

    d3.select("#indicatorFilter")
        .selectAll("option")
        .data(indicatorOptions)
        .join("option")
        .text(d => d)
        .attr("value", d => d);
}

function renderCharts(data) {
    const selectedGroup = d3.select("#groupFilter").property("value");
    const selectedTime = d3.select("#timeFilter").property("value");
    const selectedIndicator = d3.select("#indicatorFilter").property("value");

    const lineData = data.filter(d =>
        d.Group === selectedGroup &&
        d.Indicator &&
        d.Indicator.includes(selectedIndicator)
    );

    const barData = data.filter(d =>
        d.TimePeriod === selectedTime &&
        d.Indicator &&
        d.Indicator.includes(selectedIndicator)
    );

    console.log("Selected Group:", selectedGroup);
    console.log("Selected Time:", selectedTime);
    console.log("Selected Indicator:", selectedIndicator);
    console.log("Line Data Points:", lineData.length);
    console.log("Bar Data Points:", barData.length);

    drawLineChart(lineData);
    drawBarChart(barData);
}

// ========== Line Chart ==========

function drawLineChart(data) {
    const svg = d3.select("#lineChart");
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(data.map(d => d.TimePeriod))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Value)])
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    g.append("g")
        .call(d3.axisLeft(y));

    const line = d3.line()
        .x(d => x(d.TimePeriod))
        .y(d => y(d.Value));

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    g.selectAll(".dot")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.TimePeriod))
        .attr("cy", d => y(d.Value))
        .attr("r", 4)
        .attr("fill", "orange")
        .on("mouseover", (event, d) => showTooltip(event, `Value: ${d.Value}%<br>CI: [${d.CI_Lower} - ${d.CI_Upper}]`))
        .on("mouseout", hideTooltip);
}

// ========== Bar Chart ==========

function drawBarChart(data) {
    const svg = d3.select("#barChart");
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 80, left: 60 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.Subgroup))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Value)])
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(y));

    g.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("x", d => x(d.Subgroup))
        .attr("y", d => y(d.Value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.Value))
        .attr("fill", "#69b3a2")
        .on("mouseover", (event, d) =>
            showTooltip(event, `Subgroup: ${d.Subgroup}<br>Value: ${d.Value}%`)
        )
        .on("mouseout", hideTooltip);
}

// ========== Tooltip ==========

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

function showTooltip(event, content) {
    tooltip
        .html(content)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 20 + "px")
        .style("display", "block");
}

function hideTooltip() {
    tooltip.style("display", "none");
}
