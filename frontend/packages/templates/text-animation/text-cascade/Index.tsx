import { AbsoluteCenter, SafeArea, SlideIn, Text } from "../../../animation/src";


export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
      <SlideIn>
          <Text id="text-0" variant="heading">A probe render wrapped in DurationCollectorProvider collects the max end</Text>
      </SlideIn>
      </AbsoluteCenter>
    </SafeArea>
  );
}