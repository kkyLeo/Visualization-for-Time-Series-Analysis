import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  field: string;
}

interface AnomalyPoint {
  timestamp: string;
  value: number;
  field: string;
  type: 'Zero Value' | 'Sharp Change';
}

export default function Example() {
  const [targetData, setTargetData] = useState<TimeSeriesPoint[]>([]);
  const [systemData, setSystemData] = useState<TimeSeriesPoint[]>([]);
  const [zeroValueAnomalies, setZeroValueAnomalies] = useState<AnomalyPoint[]>([]);
  const [sharpChangeAnomalies, setSharpChangeAnomalies] = useState<AnomalyPoint[]>([]);
  const [brushStart, setBrushStart] = useState<Date | null>(null);
  const [brushEnd, setBrushEnd] = useState<Date | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const size = { width: 800, height: 100 }; // Timeline size
  const chartSize = { width: 600, height: 300 }; // Chart size
  const margin = { top: 70, right: 30, bottom: 30, left: 50 };

  const onResize = useDebounceCallback(() => {}, 200);
  useResizeObserver({ ref: timelineRef, onResize });

  useEffect(() => {
    const loadAndProcessData = async () => {
      try {
        const targetData = await d3.csv('../../data/target_fields_new.csv').then((data) =>
          data.flatMap((row) =>
            Object.keys(row)
              .filter((key) => key !== 'timestamp')
              .map((key) => ({
                timestamp: row.timestamp!,
                field: key,
                value: +row[key]!,
              }))
          )
        );

        const systemData = await d3.csv('../../data/system_fields_new.csv').then((data) =>
          data.flatMap((row) =>
            Object.keys(row)
              .filter((key) => key !== 'timestamp')
              .map((key) => ({
                timestamp: row.timestamp!,
                field: key,
                value: +row[key]!,
              }))
          )
        );

        // Process zero-value anomalies
        const zeroValueAnomalies = await d3.csv('../../data/zero_value_periods.csv').then((data) =>
          data.map((row) => ({
            timestamp: row.Timestamp!,
            field: row.Field!,
            value: +row.Value!,
            type: 'Zero Value' as const,
          }))
        );

        // Process sharp-change anomalies
        const sharpChangeAnomalies = await d3.csv('../../data/sharp_change_periods.csv').then((data) =>
          data.map((row) => ({
            timestamp: row.Timestamp!,
            field: row.Field!,
            value: +row.Value!,
            type: 'Sharp Change' as const,
          }))
        );

        setTargetData(targetData);
        setSystemData(systemData);
        setZeroValueAnomalies(zeroValueAnomalies);
        setSharpChangeAnomalies(sharpChangeAnomalies);
      } catch (error) {
        console.error('Error loading CSV data:', error);
      }
    };

    loadAndProcessData();
  }, []);

  useEffect(() => {
    if (!isEmpty(targetData) || !isEmpty(systemData)) {
      initTimeline();
      initChart(targetData, '#target-charts');
      initChart(systemData, '#system-charts');
    }
  }, [targetData, systemData]);

  useEffect(() => {
    if (brushStart && brushEnd) {
      const filteredTargetData = targetData.filter(
        (d) => new Date(d.timestamp) >= brushStart && new Date(d.timestamp) <= brushEnd
      );
      const filteredSystemData = systemData.filter(
        (d) => new Date(d.timestamp) >= brushStart && new Date(d.timestamp) <= brushEnd
      );
      updateCharts(filteredTargetData, '#target-charts');
      updateCharts(filteredSystemData, '#system-charts');
    }
  }, [brushStart, brushEnd, targetData, systemData]);

  // const initTimeline = () => {
  //   const svg = d3
  //     .select('#timeline')
  //     .attr('width', size.width)
  //     .attr('height', size.height)
  //     .attr('viewBox', `0 0 ${size.width} ${size.height}`)
  //     .attr('preserveAspectRatio', 'xMidYMid meet');

  //   svg.selectAll('*').remove();

  //   const xScale = d3
  //     .scaleTime()
  //     .domain(
  //       d3.extent([...targetData, ...systemData], (d) => new Date(d.timestamp)) as [Date, Date]
  //     )
  //     .range([margin.left, size.width - margin.right]);

  //   const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')).tickSizeOuter(0);

  //   svg
  //     .append('g')
  //     .attr('transform', `translate(0, ${size.height - margin.bottom})`)
  //     .call(xAxis);

  //   const brush = d3
  //     .brushX()
  //     .extent([
  //       [margin.left, 0],
  //       [size.width - margin.right, size.height - margin.bottom],
  //     ])
  //     .on('end', (event) => {
  //       const selection = event.selection;
  //       if (selection) {
  //         const [start, end] = selection.map(xScale.invert);
  //         setBrushStart(start);
  //         setBrushEnd(end);
  //       }
  //     });

  //   svg.append('g').attr('class', 'brush').call(brush);
  // };
  const initTimeline = () => {
    const svg = d3
      .select('#timeline')
      .attr('width', size.width)
      .attr('height', size.height)
      .attr('viewBox', `0 0 ${size.width} ${size.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
  
    svg.selectAll('*').remove();
  
    const xScale = d3
      .scaleTime()
      .domain(
        d3.extent([...targetData, ...systemData], (d) => new Date(d.timestamp)) as [Date, Date]
      )
      .range([margin.left, size.width - margin.right]);
  
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')).tickSizeOuter(0);
  
    svg
      .append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(xAxis);
  
    const brush = d3
      .brushX()
      .extent([
        [margin.left, 0],
        [size.width - margin.right, size.height - margin.bottom],
      ])
      .on('end', (event) => {
        const selection = event.selection;
        if (selection) {
          const [start, end] = selection.map(xScale.invert);
          setBrushStart(start);
          setBrushEnd(end);
  
          // Update displayed time range
          d3.select('#selected-time-range').text(
            `Selected Time: ${d3.timeFormat('%Y-%m-%d %H:%M:%S')(start)} - ${d3.timeFormat('%Y-%m-%d %H:%M:%S')(end)}`
          );
        }
      });
  
    svg.append('g').attr('class', 'brush').call(brush);
  };
  
  const renderAnomalies = (
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    anomalies: AnomalyPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    brushStart: Date | null,
    brushEnd: Date | null
  ) => {
    const filteredAnomalies = anomalies.filter((a) => {
      const timestamp = new Date(a.timestamp);
      return (
        (!brushStart || timestamp >= brushStart) &&
        (!brushEnd || timestamp <= brushEnd)
      );
    });
  
    // Render zero-value anomalies
    svg
      .selectAll('.zero-anomaly')
      .data(filteredAnomalies.filter((a) => a.type === 'Zero Value'))
      .join('circle')
      .attr('class', 'zero-anomaly')
      .attr('cx', (d) => xScale(new Date(d.timestamp)))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 2)
      .attr('fill', 'blue');
  
    // Render sharp-change anomalies
    svg
      .selectAll('.sharp-anomaly')
      .data(filteredAnomalies.filter((a) => a.type === 'Sharp Change'))
      .join('circle')
      .attr('class', 'sharp-anomaly')
      .attr('cx', (d) => xScale(new Date(d.timestamp)))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 4)
      .attr('fill', 'red');
  };

//   const initChart = (data: TimeSeriesPoint[], containerId: string) => {
//     const groupedData = d3.groups(data, (d) => d.field);
  
//     groupedData.forEach(([field, fieldData], index) => {
//       const chartContainer = d3.select(`${containerId}-${index}`);
//       chartContainer.selectAll('*').remove();
  
//       const svg = chartContainer
//         .append('svg')
//         .attr('width', '100%')
//         .attr('height', chartSize.height)
//         .attr('viewBox', `0 0 ${chartSize.width} ${chartSize.height}`)
//         .attr('preserveAspectRatio', 'xMidYMid meet');
  
//       const xScale = d3
//         .scaleTime()
//         .domain(d3.extent(fieldData, (d) => new Date(d.timestamp)) as [Date, Date])
//         .range([margin.left, chartSize.width - margin.right]);
  
//       const yScale = d3
//         .scaleLinear()
//         .domain([0, d3.max(fieldData, (d) => d.value) ?? 0])
//         .range([chartSize.height - margin.bottom, margin.top]);
  
//       const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')).tickSizeOuter(0);
//       const yAxis = d3.axisLeft(yScale).ticks(4);
  
//       svg
//         .append('g')
//         .attr('transform', `translate(0, ${chartSize.height - margin.bottom})`)
//         .call(xAxis);
  
//       svg
//         .append('g')
//         .attr('transform', `translate(${margin.left}, 0)`)
//         .call(yAxis);
  
//       const line = d3
//         .line<TimeSeriesPoint>()
//         .x((d) => xScale(new Date(d.timestamp)))
//         .y((d) => yScale(d.value));
  
//       svg
//         .append('path')
//         .datum(fieldData)
//         .attr('fill', 'none')
//         .attr('stroke', 'steelblue')
//         .attr('stroke-width', 1.5)
//         .attr('d', line);
  
//       svg
//         .append('text')
//         .attr('x', chartSize.width / 2)
//         .attr('y', margin.top / 2)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '1rem')
//         .style('font-weight', 'bold')
//         .text(field);
  
//       // Render anomalies for the current field
//       const anomalies = [...zeroValueAnomalies, ...sharpChangeAnomalies].filter(
//         (a) => a.field === field
//       );
//       renderAnomalies(svg, anomalies, xScale, yScale, brushStart, brushEnd);
  
//       // Add legend
//       const zeroCount = anomalies.filter(
//         (a) =>
//           a.type === 'Zero Value' &&
//           (!brushStart || new Date(a.timestamp) >= brushStart) &&
//           (!brushEnd || new Date(a.timestamp) <= brushEnd)
//       ).length;
  
//       const sharpCount = anomalies.filter(
//         (a) =>
//           a.type === 'Sharp Change' &&
//           (!brushStart || new Date(a.timestamp) >= brushStart) &&
//           (!brushEnd || new Date(a.timestamp) <= brushEnd)
//       ).length;
  
//       // Append a text element for the legend
// svg
//   .append('text')
//   .attr('x', chartSize.width / 2) // Center horizontally
//   .attr('y', chartSize.height - margin.bottom / 2 + 40) // Position near the bottom of the SVG
//   .attr('text-anchor', 'middle') // Center align the text
//   .style('font-size', '1.2rem') // Set font size
//   .style('font-weight', 'normal') // Optional: Adjust font weight
//   .html(
//     `<tspan style="fill: blue;">Blue (Zero Value): ${zeroCount}</tspan> | 
//     <tspan style="fill: red;">Red (Sharp Change): ${sharpCount}</tspan>`
//   );


//     });
//   };
const initChart = (data: TimeSeriesPoint[], containerId: string) => {
  const groupedData = d3.groups(data, (d) => d.field);

  groupedData.forEach(([field, fieldData], index) => {
    const chartContainer = d3.select(`${containerId}-${index}`);
    chartContainer.selectAll('*').remove();

    const svg = chartContainer
      .append('svg')
      .attr('width', '100%')
      .attr('height', chartSize.height)
      .attr('viewBox', `0 0 ${chartSize.width} ${chartSize.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(fieldData, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([margin.left, chartSize.width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(fieldData, (d) => d.value) ?? 0])
      .range([chartSize.height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(4);

    svg
      .append('g')
      .attr('transform', `translate(0, ${chartSize.height - margin.bottom})`)
      .call(xAxis);

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);

    const line = d3
      .line<TimeSeriesPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.value));

    // Update the stroke color for time series points to grey
    svg
      .append('path')
      .datum(fieldData)
      .attr('fill', 'none')
      .attr('stroke', 'grey') // Changed to 'grey'
      .attr('stroke-width', 1.5)
      .attr('d', line);

    svg
      .append('text')
      .attr('x', chartSize.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '1rem')
      .style('font-weight', 'bold')
      .text(field);

    // Render anomalies for the current field
    const anomalies = [...zeroValueAnomalies, ...sharpChangeAnomalies].filter(
      (a) => a.field === field
    );
    renderAnomalies(svg, anomalies, xScale, yScale, brushStart, brushEnd);

    // Add legend
    const zeroCount = anomalies.filter(
      (a) =>
        a.type === 'Zero Value' &&
        (!brushStart || new Date(a.timestamp) >= brushStart) &&
        (!brushEnd || new Date(a.timestamp) <= brushEnd)
    ).length;

    const sharpCount = anomalies.filter(
      (a) =>
        a.type === 'Sharp Change' &&
        (!brushStart || new Date(a.timestamp) >= brushStart) &&
        (!brushEnd || new Date(a.timestamp) <= brushEnd)
    ).length;

    // Append a text element for the legend
    svg
      .append('text')
      .attr('x', chartSize.width / 2) // Center horizontally
      .attr('y', chartSize.height - margin.bottom / 2 + 40) // Position near the bottom of the SVG
      .attr('text-anchor', 'middle') // Center align the text
      .style('font-size', '1.2rem') // Set font size
      .style('font-weight', 'normal') // Optional: Adjust font weight
      .html(
        `<tspan style="fill: blue;">Blue (Zero Value): ${zeroCount}</tspan> | 
         <tspan style="fill: red;">Red (Sharp Change): ${sharpCount}</tspan>`
      );
  });
};


  const updateCharts = (data: TimeSeriesPoint[], containerId: string) => {
    initChart(data, containerId);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  {/* Timeline Section */}
  <div
    id="timeline-container"
    style={{
      height: '120px', // Increase the height of the timeline container
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: '#fff',
      marginBottom: '10px', // Add space below the timeline
    }}
  >
    <div
      id="selected-time-range"
      style={{
        marginTop: '5px',
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: 'bold',
      }}
    >
      Selected Time: None
    </div>
    <svg id="timeline" width="100%" height="100%"></svg>
  </div>

  {/* Main Content Section */}
  <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: '10px' }}>
    {/* System Charts */}
    <div
      id="system-charts"
      style={{
        flex: 1,
        overflowY: 'auto',
        borderRight: '1px solid #ccc',
        padding: '10px',
      }}
    >
      {systemData.length > 0 &&
        d3.groups(systemData, (d) => d.field).map(([field], index) => (
          <div key={index} id={`system-charts-${index}`} style={{ marginBottom: '20px' }}></div>
        ))}
    </div>

    {/* Target Charts */}
    <div
      id="target-charts"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
      }}
    >
      {targetData.length > 0 &&
        d3.groups(targetData, (d) => d.field).map(([field], index) => (
          <div key={index} id={`target-charts-${index}`} style={{ marginBottom: '20px' }}></div>
        ))}
    </div>
  </div>
</div>

  );
}
