import React, { useMemo, useCallback } from "react";
import ReactFlow, {
    ReactFlowProvider,
    Controls,
    Handle,
    Position,
    Node,
    Edge,
    NodeProps,
    EdgeProps,
    useStore,
    getSmoothStepPath,
    BaseEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { TrillGenerator } from "../../../TrillGenerator";
import { useCode } from "../../../hook/useCode";
import { getLayoutedElements } from "../../../utils/provenanceLayout";
import styles from "./TrillProvenanceWindow.module.css";

const HANDLE_STYLE: React.CSSProperties = { opacity: 0, pointerEvents: "none" };
const EDGE_STYLE: React.CSSProperties = { stroke: "#222", strokeWidth: 2 };

// Floating edge for TB layout: path computed from actual RF-measured node dimensions,
// connecting bottom of source to top of target with no gap.
function ProvenanceEdge({ id, source, target, style }: EdgeProps) {
    const src = useStore(useCallback((s: any) => s.nodeInternals.get(source), [source]));
    const tgt = useStore(useCallback((s: any) => s.nodeInternals.get(target), [target]));

    if (!src?.width || !src?.height || !tgt?.width || !tgt?.height) return null;

    const [edgePath] = getSmoothStepPath({
        sourceX: src.positionAbsolute.x + src.width / 2,
        sourceY: src.positionAbsolute.y + src.height,
        sourcePosition: Position.Bottom,
        targetX: tgt.positionAbsolute.x + tgt.width / 2,
        targetY: tgt.positionAbsolute.y,
        targetPosition: Position.Top,
    });

    return <BaseEdge id={id} path={edgePath} style={style} />;
}

function TrillVersionCard({ data }: NodeProps) {
    const { label } = data as { label: string };
    return (
        <div style={{ position: "relative" }}>
            <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
            <div
                style={{
                    padding: "8px 14px",
                    background: "#fff",
                    border: "1.5px solid #bbb",
                    borderRadius: 6,
                    fontSize: 12,
                    minWidth: 160,
                    textAlign: "center",
                    cursor: "pointer",
                    userSelect: "none",
                }}
            >
                {label}
            </div>
            <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
        </div>
    );
}

const nodeTypes = { trillNode: TrillVersionCard };
const edgeTypes = { provenanceEdge: ProvenanceEdge };

function TrillProvenanceGraph({ open }: { open: boolean }) {
    const { loadTrill } = useCode();

    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
        const prov = TrillGenerator.provenanceJSON;
        if (!prov || !prov.nodes || prov.nodes.length === 0) {
            return { nodes: [], edges: [] };
        }

        const rfNodes: Node[] = prov.nodes.map((n: any) => ({
            id: n.id,
            type: "trillNode",
            position: { x: 0, y: 0 },
            data: { label: n.label || n.id },
        }));

        const rfEdges: Edge[] = prov.edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            type: "provenanceEdge",
            style: EDGE_STYLE,
        }));

        return getLayoutedElements(rfNodes, rfEdges, 200, 60, "TB");
    }, [open]);

    const onNodeClick = useCallback(
        (_: any, node: Node) => {
            TrillGenerator.switchProvenanceTrill(node.id, loadTrill);
        },
        [loadTrill]
    );

    if (layoutedNodes.length === 0) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#999", background: "#e8e8e8" }}>
                No versions yet
            </div>
        );
    }

    return (
        <ReactFlow
            nodes={layoutedNodes}
            edges={layoutedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnDoubleClick={false}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            style={{ background: "#e8e8e8" }}
            proOptions={{ hideAttribution: true }}
        >
            <Controls showInteractive={false} />
        </ReactFlow>
    );
}

export default function TrillProvenanceWindow({
    open,
    closeModal,
    workflowName,
}: {
    open: boolean;
    closeModal: any;
    workflowName: string;
}) {
    return (
        <>
            {open ? (
                <div>
                    <div className={styles.modalBackground} />
                    <div className={styles.modal}>
                        <span className={styles.closeX} onClick={closeModal}>X</span>
                        <p className={styles.title}>Provenance for {workflowName}</p>
                        <div className={styles.graphDiv}>
                            <ReactFlowProvider>
                                <TrillProvenanceGraph open={open} />
                            </ReactFlowProvider>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
