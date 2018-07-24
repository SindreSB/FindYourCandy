alarms = {
    "0x00": {
        "Category": "Public Alarm",
        "Name": "Reset Alarm",
        "SetCondition": " After the system reset, the reset alarm will be set automatically",
        "ResetCondition": " Protocol instruction is cleared"
    },
    "0x11": {
        "Category": "Planning Alarm",
        "Name": "Inverse Resolve Alarm",
        "SetCondition": "The planning target point is not in the robot work space, resulting in the reverse solution error",
        "ResetCondition": "The protocol instruction is cleared"
    },
    "0x44": {
        "Category": "Limit Alarm",
        "Name": "Joint 3 Positive Limit Alarm",
        "SetCondition": "Joint 3 moves in the positive direction to the limit area",
        "ResetCondition": "Protocol command reset the alarm manually; reset the alarm in reverse exit limit area automatically"
    }
}