import { AbsoluteCenter, SafeArea, Text } from "../../../animation/src";


export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
          <Text id="text-0" variant="display">My Template</Text>
      </AbsoluteCenter>
    </SafeArea>
  );
}