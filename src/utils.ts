export function createBufferFloat32(
  device: GPUDevice,
  arr: Float32Array,
  usage: number
) {
  const buffer = device.createBuffer({
    size: Math.ceil(arr.byteLength / 4) * 4, // Buffer copies must be 4 byte aligned.
    usage,
    mappedAtCreation: true,
  });

  new Float32Array(buffer.getMappedRange()).set(arr);

  buffer.unmap();

  return buffer;
}

export function createBufferUInt16(
  device: GPUDevice,
  arr: Uint16Array,
  usage: number
) {
  const buffer = device.createBuffer({
    size: Math.ceil(arr.byteLength / 4) * 4, // Buffer copies must be 4 byte aligned.
    usage,
    mappedAtCreation: true,
  });

  new Uint16Array(buffer.getMappedRange()).set(arr);

  buffer.unmap();

  return buffer;
}

const SHADER_ERROR_REGEX = /([0-9]*):([0-9*]*): (.*)$/gm;

// https://github.com/toji/webgpu-test/blob/67c79bc3501fe62891fca4f592e6025aa8f152fb/js/webgpu-renderer/webgpu-renderer.js#L37
export function createShader(device: GPUDevice, code: string) {
  device.pushErrorScope("validation");

  const shaderModule = device.createShaderModule({
    code,
  });

  device.popErrorScope().then((error) => {
    if (error) {
      const message = (error as any).message as string;
      const codeLines = code.split("\n");

      // Find every line in the error that matches a known format. (line:char: message)
      const errorList = message.matchAll(SHADER_ERROR_REGEX);

      // Loop through the parsed error messages and show the relevant source code for each message.
      let errorMessage = "";
      let errorStyles = [];

      let lastIndex = 0;

      for (const errorMatch of errorList) {
        if (!errorMatch) {
          continue;
        }

        const index = errorMatch.index as number;

        // Include out any content between the parsable lines
        if (index > lastIndex + 1) {
          errorMessage += message.substring(lastIndex, errorMatch.index);
        }

        lastIndex = index + errorMatch[0].length;

        // Show the correlated line with an arrow that points at the indicated error position.
        const errorLine = parseInt(errorMatch[1], 10) - 1;
        const errorChar = parseInt(errorMatch[2], 10);
        const errorPointer = "-".repeat(errorChar - 1) + "^";
        errorMessage += `${errorMatch[0]}\n%c${codeLines[errorLine]}\n%c${errorPointer}%c\n`;
        errorStyles.push(
          "color: grey;",
          "color: green; font-weight: bold;",
          "color: default;"
        );
      }

      // If no parsable errors were found, just print the whole message.
      if (lastIndex == 0) {
        console.error(message);
        return;
      }

      // Otherwise append any trailing message content.
      if (message.length > lastIndex + 1) {
        errorMessage += message.substring(lastIndex + 1, message.length);
      }

      // Finally, log to console as an error.
      console.error(errorMessage, ...errorStyles);
    }
  });

  return shaderModule;
}
