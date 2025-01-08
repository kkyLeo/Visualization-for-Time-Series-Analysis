    import React, { useEffect, useState } from 'react';
    import * as d3 from 'd3';

    export default function CoOccurrenceMatrix() {
    const [targetFields, setTargetFields] = useState<string[]>([]);
    const [matrixData, setMatrixData] = useState<any[]>([]);
    const [originalMatrixData, setOriginalMatrixData] = useState<any[]>([]);
    const [sortedMatrixData, setSortedMatrixData] = useState<any[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [searchIdx, setSearchIdx] = useState<number | null>(null);

    const size = { width: 800, height: 800 }; // Matrix size
    const margin = { top: 50, right: 20, bottom: 65, left: 50 };

    useEffect(() => {
        const loadData = async () => {
        try {
            // Load target fields
            const targetData = await d3.csv('../../data/target_fields_new.csv').then((data) =>
            Array.from(new Set(data.flatMap((row) => Object.keys(row).filter((key) => key !== 'timestamp'))))
            );
            setTargetFields(targetData);

            // Load cross-correlation data
            const matrixData = await d3.csv('../../data/cross_correlation_analysis_new.csv').then((data) =>
            data.map((row) => ({
                field1: row.Field1!,
                field2: row.Field2!,
                value: +row.Cross_Correlation!,
                lag: +row.Lag!,
            }))
            );
            setMatrixData(matrixData);
            setOriginalMatrixData(matrixData);
            setSortedMatrixData([...matrixData].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)));
        } catch (error) {
            console.error('Error loading data:', error);
        }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (targetFields.length && matrixData.length) {
        renderMatrix(matrixData);
        }
    }, [matrixData]);

    useEffect(() => {
        if (matrixData.length > 0) {
            calculateFieldRelationships();
        }
    }, [matrixData]);
    
    const calculateFieldRelationships = () => {
        const relationshipCounts: Record<string, number> = {};
    
        // Count occurrences of each field in the matrix data
        matrixData.forEach((d) => {
            relationshipCounts[d.field1] = (relationshipCounts[d.field1] || 0) + 1;
            relationshipCounts[d.field2] = (relationshipCounts[d.field2] || 0) + 1;
        });
    
        // Convert to array and sort by count
        const sortedCounts = Object.entries(relationshipCounts)
            .map(([field, count]) => ({ field, count }))
            .sort((a, b) => b.count - a.count);
    
        setSortedMatrixData(sortedCounts); // Update the state for the sorted list
    };    

    const renderMatrix = (data: any[], isSorted = false) => {
        const svg = d3
        .select('#matrix')
        .attr('width', size.width)
        .attr('height', size.height)
        .attr('viewBox', `0 0 ${size.width} ${size.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
        svg.selectAll('*').remove();
    
        // Determine the field order for the current rendering
        const currentFieldOrder = isSorted
        ? Array.from(new Set(data.flatMap((d) => [d.field1, d.field2])))
        : targetFields;
    
        const xScale = d3
        .scaleBand()
        .domain(currentFieldOrder)
        .range([margin.left, size.width - margin.right])
        .padding(0.1);
    
        const yScale = d3
        .scaleBand()
        .domain(currentFieldOrder)
        .range([margin.top, size.height - margin.bottom])
        .padding(0.1);
    
        const colorScale = d3
        .scaleSequential(d3.interpolateBlues) // Use a sequential color scheme
        .domain([0.65, 1.0]); // Adjust the domain to focus on the range of interest
    
        // Draw grid cells
        svg
        .selectAll('.cell')
        .data(data)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => xScale(d.field2) ?? 0)
        .attr('y', (d) => yScale(d.field1) ?? 0)
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', (d) => colorScale(d.value))
        .on('mouseover', (event, d) => {
            const tooltip = d3.select('#tooltip');
            
            // Set initial content and position
            tooltip
                .style('left', `${event.pageX + 5}px`)
                .style('top', `${event.pageY + 5}px`)
                .style('display', 'block')
                .html(
                    `<strong>Field1 (Idx):</strong> ${d.field1} (${targetFields.indexOf(d.field1) + 1})<br>` +
                    `<strong>Field2 (Idx):</strong> ${d.field2} (${targetFields.indexOf(d.field2) + 1})<br>` +
                    `<strong>Correlation:</strong> ${d.value.toFixed(2)}<br>` +
                    `<strong>Lag:</strong> ${d.lag}`
                );
        
            // Get tooltip node and ensure it's not null
            const tooltipNode = tooltip.node() as HTMLElement | null;
        
            if (tooltipNode) {
                const tooltipWidth = tooltipNode.offsetWidth;
                const tooltipHeight = tooltipNode.offsetHeight;
        
                // Get viewport dimensions
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
        
                // Adjust tooltip position if it exceeds boundaries
                let left = event.pageX + 5;
                let top = event.pageY + 5;
        
                if (left + tooltipWidth > viewportWidth) {
                    left = event.pageX - tooltipWidth - 5; // Move left if it exceeds right boundary
                }
                if (top + tooltipHeight > viewportHeight) {
                    top = event.pageY - tooltipHeight - 5; // Move up if it exceeds bottom boundary
                }
        
                tooltip.style('left', `${left}px`).style('top', `${top}px`);
            }
        })
        .on('mouseout', () => {
            d3.select('#tooltip').style('display', 'none');
        });
        
    
        // Draw x-axis with original idx mapping
        svg
        .append('g')
        .attr('transform', `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat((d) => `${targetFields.indexOf(d) + 1}`))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-45)');
    
        // Draw y-axis with original idx mapping
        svg
        .append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat((d) => `${targetFields.indexOf(d) + 1}`));
    };
    const handleSortMatrix = () => {
        const sortedMatrix = [...matrixData].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        renderMatrix(sortedMatrix, true); // Pass isSorted as true to update positions
    };
    
    const handleResetMatrix = () => {
        renderMatrix(originalMatrixData); // Render original matrix without modifying the order
    };
    
    
    

    const handleSearchClick = () => {
        const idx = parseInt(searchValue, 10);
        setSearchIdx(idx);
        document.getElementById(`field-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#fff',
                zIndex: 10,
                padding: '10px',
            }}
            >
            {/* Title Section */}
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '20px' }}>
                Cross-Correlation Analysis
            </div>

            {/* Search and Controls Section */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                type="number"
                placeholder="Search idx"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ padding: '5px', fontSize: '14px', marginRight: '10px' }}
                />
                <button onClick={handleSearchClick} style={{ padding: '5px 10px', fontSize: '14px' }}>
                Search
                </button>
                <button onClick={handleSortMatrix} style={{ padding: '5px 10px', fontSize: '14px', marginLeft: '10px' }}>
                Sort Matrix
                </button>
                <button onClick={handleResetMatrix} style={{ padding: '5px 10px', fontSize: '14px', marginLeft: '10px' }}>
                Reset Matrix
                </button>
            </div>
            </div>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                {/* Dictionary Section */}
                <div
                style={{
                    flex: 1,
                    borderRight: '1px solid #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                >
                {/* Upper Part: Dictionary */}
                <div style={{ flex: 1, overflowY: 'scroll', padding: '10px', backgroundColor: '#f9f9f9' }}>
                    <h4>Field Dictionary</h4>
                    <div>
                    {targetFields.map((field, idx) => (
                        <div key={idx} id={`field-${idx + 1}`}>
                        {`${idx + 1}: ${field}`}
                        </div>
                    ))}
                    </div>
                </div>

                {/* Lower Part: Sorted Correlations */}
                <div style={{ flex: 1, overflowY: 'scroll', padding: '10px', backgroundColor: '#eef1f5' }}>
                    <h4>Sorted Correlations</h4>
                    <div>
                        {sortedMatrixData.map((d, idx) => (
                            <div key={idx}>
                                {`${idx + 1}: ${d.field} (Relationships: ${d.count})`}
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* Matrix Section */}
                <svg id="matrix" style={{ flex: 2 }}></svg>
            </div>

            <div
                id="tooltip"
                style={{
                position: 'absolute',
                display: 'none',
                padding: '5px',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                pointerEvents: 'none',
                }}
            ></div>
        </div>
    );
    }
