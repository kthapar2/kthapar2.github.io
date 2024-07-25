// Load the CSV file
d3.csv("annual-co2-emissions-per-country.csv").then(data => {
    // Process the data
    data.forEach(d => {
        d.Year = +d.Year;
        d["Annual CO₂ emissions"] = +d["Annual CO₂ emissions"];
    });

    // Get unique countries and add "Global" option
    const countries = ["Global", ...new Set(data.map(d => d.Entity))];

    // Populate country select
    const countrySelect = d3.select("#country-select")
        .selectAll("option")
        .data(countries)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Set up dimensions
    const margin = {top: 50, right: 50, bottom: 50, left: 70};
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .range([height, 0]);

    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d["Annual CO₂ emissions"]));

    // Add x-axis
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`);

    // Add y-axis
    const yAxis = svg.append("g");

    // Add x-axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("Year");

    // Add y-axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Annual CO₂ emissions (million tonnes)");

    // Add line path
    const path = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Function to update the chart
    function updateChart(country) {
        let chartData;
        if (country === "Global") {
            // Aggregate data for all countries
            chartData = d3.rollup(data, 
                v => d3.sum(v, d => d["Annual CO₂ emissions"]),
                d => d.Year
            );
            chartData = Array.from(chartData, ([Year, emissions]) => ({Year, "Annual CO₂ emissions": emissions}))
                .sort((a, b) => a.Year - b.Year);
        } else {
            chartData = data.filter(d => d.Entity === country)
                .sort((a, b) => a.Year - b.Year);
        }

        // Filter out zero or very small values
        chartData = chartData.filter(d => d["Annual CO₂ emissions"] > 0.1);

        xScale.domain(d3.extent(chartData, d => d.Year));
        yScale.domain([0, d3.max(chartData, d => d["Annual CO₂ emissions"])]);

        xAxis.transition().duration(1000).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        yAxis.transition().duration(1000).call(d3.axisLeft(yScale).tickFormat(d => d / 1e6));

        path.datum(chartData)
            .transition()
            .duration(1000)
            .attr("d", line);

        // Update dots
        const dots = svg.selectAll(".dot")
            .data(chartData);

        dots.enter()
            .append("circle")
            .attr("class", "dot")
            .merge(dots)
            .transition()
            .duration(1000)
            .attr("cx", d => xScale(d.Year))
            .attr("cy", d => yScale(d["Annual CO₂ emissions"]))
            .attr("r", 4)
            .attr("fill", "steelblue");

        dots.exit().remove();

        // Update tooltip functionality
        svg.selectAll(".dot")
            .on("mouseover", (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Year: ${d.Year}<br/>Emissions: ${(d["Annual CO₂ emissions"] / 1e6).toFixed(2)} million tonnes`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    // Initialize with global data
    updateChart("Global");

    // Event listener for country select
    d3.select("#country-select").on("change", function() {
        updateChart(this.value);
    });

    // Initialize current scene
    let currentScene = 0;

    // Define scenes
    const scenes = [
        {
            title: "Global CO₂ Emissions Over Time",
            description: "This chart shows the total global CO₂ emissions from 1800 to 2021. Use the dropdown to explore data for individual countries.",
            country: "Global",
            annotation: null
        },
        {
            title: "Industrial Revolution Impact",
            description: "Notice the sharp increase in emissions starting from the mid-19th century, coinciding with the Industrial Revolution.",
            country: "United Kingdom",
            annotation: {
                year: 1850,
                text: "Start of rapid increase"
            }
        },
        {
            title: "Post-World War II Economic Boom",
            description: "Observe the accelerated growth in emissions following World War II, reflecting global economic expansion.",
            country: "United States",
            annotation: {
                year: 1950,
                text: "Post-war boom"
            }
        },
        {
            title: "China's Economic Rise",
            description: "China's emissions have grown dramatically since the 1990s, reflecting its rapid industrialization and economic growth.",
            country: "China",
            annotation: {
                year: 2000,
                text: "Rapid growth phase"
            }
        }
    ];

    // Function to update button visibility
    function updateButtonVisibility() {
        const prevButton = d3.select("#prevButton");
        const nextButton = d3.select("#nextButton");

        prevButton.style("display", currentScene > 0 ? "inline-block" : "none");
        nextButton.style("display", currentScene < scenes.length - 1 ? "inline-block" : "none");
    }

    // Function to update the scene
    function updateScene() {
        const scene = scenes[currentScene];
        
        // Update title and description
        d3.select("h1").text(scene.title);
        d3.select("#description").text(scene.description);
        
        // Update country selection if specified
        if (scene.country) {
            d3.select("#country-select").property("value", scene.country);
            updateChart(scene.country);
        }

        // Add annotation if specified
        if (scene.annotation) {
            const annotationData = data.find(d => d.Entity === scene.country && d.Year === scene.annotation.year);
            const annotations = [{
                note: {
                    label: scene.annotation.text,
                    title: scene.annotation.year.toString()
                },
                x: xScale(scene.annotation.year),
                y: yScale(annotationData["Annual CO₂ emissions"]),
                dy: -30,
                dx: 0
            }];

            const makeAnnotations = d3.annotation()
                .annotations(annotations);

            svg.selectAll(".annotation-group").remove();
            svg.append("g")
                .attr("class", "annotation-group")
                .call(makeAnnotations);
        } else {
            svg.selectAll(".annotation-group").remove();
        }

        // Update button visibility
        updateButtonVisibility();
    }

    // Event listeners for navigation buttons
    d3.select("#prevButton").on("click", () => {
        if (currentScene > 0) {
            currentScene--;
            updateScene();
        }
    });

    d3.select("#nextButton").on("click", () => {
        if (currentScene < scenes.length - 1) {
            currentScene++;
            updateScene();
        }
    });

    // Initial scene update
    updateScene();
});