import * as Triangle from "./Triangle";
import { createBufferFloat32, createBufferUInt16, createShader } from "./utils";
import fragmentShaderSrc from "./shaders/frag.wgsl?raw";
import vertexShaderSrc from "./shaders/vert.wgsl?raw";

const entry = navigator.gpu;

if (!entry) {
  throw new Error("WebGPU is not supported in this browser.");
}

const adapter = await entry.requestAdapter();

if (!adapter) {
  throw new Error("Could not access GPU adapter.");
}

const device = await adapter.requestDevice();

if (!device) {
  throw new Error("Could not access GPU device.");
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const context = canvas.getContext("gpupresent");

if (!context) {
  throw new Error("Could not get WebGPU canvas context.");
}

const format = await context.getSwapChainPreferredFormat(
  adapter as any /* TODO: Types need to be updated */
);

const swapchain = context.configureSwapChain({
  device,
  format,
});

let msaaColorTextureView: GPUTextureView;
let depthTextureView: GPUTextureView;

function onResize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const msaaColorTexture = device!.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    sampleCount: 4,
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  msaaColorTextureView = msaaColorTexture.createView();

  const depthTexture = device!.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    sampleCount: 4,
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  depthTextureView = depthTexture.createView();
}

onResize();
window.addEventListener("resize", onResize);

const positionBuffer = createBufferFloat32(
  device,
  Triangle.positions,
  GPUBufferUsage.VERTEX
);
const colorBuffer = createBufferFloat32(
  device,
  Triangle.colors,
  GPUBufferUsage.VERTEX
);
const indexBuffer = createBufferUInt16(
  device,
  Triangle.indices,
  GPUBufferUsage.INDEX
);

const fragShaderModule = createShader(device, fragmentShaderSrc);
const vertShaderModule = createShader(device, vertexShaderSrc);

// prettier-ignore
const uniformData = new Float32Array([
  // ModelViewProjection Matrix
  1.0, 0.0, 0.0, 0.0,
  0.0, 1.0, 0.0, 0.0,
  0.0, 0.0, 1.0, 0.0,
  0.0, 0.0, 0.0, 1.0,

  // Primary Color (unused)
  0.9, 0.1, 0.3, 1.0,

  // Accent Color (unused)
  0.8, 0.2, 0.8, 1.0,
]);

const uniformBuffer = createBufferFloat32(
  device,
  uniformData,
  GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
);

const uniformBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "uniform",
      },
    },
  ],
});

const uniformBindGroup = device.createBindGroup({
  layout: uniformBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    },
  ],
});

const pipelineLayout = device.createPipelineLayout({
  bindGroupLayouts: [uniformBindGroupLayout],
});

const pipeline = device.createRenderPipeline(
  {
    layout: pipelineLayout,
    vertex: {
      module: vertShaderModule,
      entryPoint: "main",
      buffers: [
        {
          // POSITION
          arrayStride: 4 * 3,
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x3",
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
        {
          // COLOR_0
          arrayStride: 4 * 3,
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x3",
              offset: 0,
              shaderLocation: 1,
            },
          ],
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      frontFace: "cw",
      cullMode: "none",
    },
    depthStencil: {
      format: "depth24plus-stencil8",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    fragment: {
      module: fragShaderModule,
      entryPoint: "main",
      targets: [
        {
          format: "bgra8unorm",
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
          writeMask: GPUColorWrite.ALL,
        },
      ],
    },
    multisample: {
      count: 4,
    },
  } as any /* TODO: Types need an update */
);

const commandEncoder = device.createCommandEncoder();

const passEncoder = commandEncoder.beginRenderPass({
  colorAttachments: [
    {
      attachment: msaaColorTextureView!,
      resolveTarget: swapchain.getCurrentTexture().createView(),
      loadValue: { r: 0, g: 0, b: 0, a: 1 },
      storeOp: "store",
    },
  ],
  depthStencilAttachment: {
    attachment: depthTextureView!,
    depthLoadValue: 1,
    depthStoreOp: "store",
    stencilLoadValue: "load",
    stencilStoreOp: "store",
  },
});

passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, uniformBindGroup);
passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
passEncoder.setScissorRect(0, 0, canvas.width, canvas.height);
passEncoder.setVertexBuffer(0, positionBuffer);
passEncoder.setVertexBuffer(1, colorBuffer);
passEncoder.setIndexBuffer(indexBuffer, "uint16");
passEncoder.drawIndexed(3, 1, 0, 0, 0);
passEncoder.endPass();

device.queue.submit([commandEncoder.finish()]);
